import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR not configured" }, { status: 503 });
  }

  const { imageUrl } = await req.json();
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: `This is an ID document photo. Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{
  "fullName": "full name as printed on the document or null",
  "dob": "date of birth in YYYY-MM-DD format or null",
  "idNumber": "the document/ID number or null",
  "address": "address if visible or null",
  "nationality": "nationality if visible, default to Nepali if document appears Nepali, or null",
  "idType": "one of: Citizenship, Passport, Driving License, Voter ID, PAN Card, Other, or null"
}

Only include fields that are clearly legible. Return null for anything uncertain.`,
            },
          ],
        },
      ],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    // Extract JSON from response (strip any accidental markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse OCR result" }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ extracted });
  } catch (err) {
    console.error("ID OCR error:", err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
