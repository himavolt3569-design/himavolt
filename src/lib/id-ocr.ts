/**
 * Best-effort field extraction from OCR text read off a guest ID document
 * (citizenship, passport, driving licence, etc). Pure and side-effect free —
 * pair it with tesseract.js's `recognize()` output at the call site.
 */
export interface ParsedIdFields {
  fullName?: string;
  dob?: string;
  idNumber?: string;
  address?: string;
  nationality?: string;
  idType?: string;
}

export function parseIdText(text: string): ParsedIdFields {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();

  let idType: string | undefined;
  if (upper.includes("PASSPORT")) idType = "PASSPORT";
  else if (upper.includes("DRIVING") || upper.includes("DRIVER")) idType = "DRIVING_LICENSE";
  else if (upper.includes("CITIZENSHIP") || upper.includes("CITIZEN")) idType = "CITIZENSHIP";
  else if (upper.includes("NATIONAL ID") || upper.includes("NATIONAL IDENTITY")) idType = "NATIONAL_ID";

  let fullName: string | undefined;
  for (const line of lines) {
    const m = line.match(/(?:name|full\s*name|surname)[\s:]+([A-Za-z\s]{3,50})/i);
    if (m) { fullName = m[1].trim(); break; }
  }

  const dobMatch =
    text.match(/(?:dob|date of birth|birth date|born)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i) ||
    text.match(/(\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
  const dob = dobMatch?.[1];

  const idMatch =
    text.match(/(?:no|number|id no|passport no|license no)[\s:.#]*([A-Z0-9]{6,15})/i) ||
    text.match(/\b([A-Z]{1,3}[0-9]{6,10})\b/) ||
    text.match(/\b([0-9]{8,12})\b/);
  const idNumber = idMatch?.[1];

  const natMatch = text.match(/(?:nationality|country)[\s:]+([A-Za-z\s]{3,20})/i);
  const nationality = natMatch?.[1].trim();

  const addrMatch = text.match(/(?:address|addr)[\s:]+([^\n]+)/i);
  const address = addrMatch?.[1].trim();

  return { fullName, dob, idNumber, address, nationality, idType };
}

export const ID_TYPES = ["Citizenship", "Passport", "Driving License", "Voter ID", "PAN Card", "Other"];
