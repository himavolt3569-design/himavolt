import { db } from "@/lib/db";

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface MetricItem {
  id: string;
  value: string;
  label: string;
  suffix: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface LandingSettings {
  features: FeatureItem[];
  metrics: MetricItem[];
  faqs: FAQItem[];
}

const DEFAULTS: LandingSettings = {
  features: [],
  metrics: [],
  faqs: [],
};

export async function getLandingSettings(): Promise<LandingSettings> {
  try {
    const rows = await db.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM site_settings WHERE key LIKE 'landing_%'
    `;
    
    const result: Partial<LandingSettings> = {};
    
    for (const row of rows) {
      const field = row.key.replace("landing_", "") as keyof LandingSettings;
      try {
        result[field] = JSON.parse(row.value);
      } catch {
        // invalid JSON
      }
    }
    
    return { ...DEFAULTS, ...result };
  } catch (error) {
    console.error("[getLandingSettings] Error:", error);
    return DEFAULTS;
  }
}
