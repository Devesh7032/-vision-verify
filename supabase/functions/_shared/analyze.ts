import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

type AnalyzeMode = "product_recognition" | "ai_detection" | "fake_detection" | "product_comparison";

type AnalyzeRequestBody = {
  imageBase64?: string;
  mimeType?: string;
  imageUrl?: string | null;
  imageBase64B?: string;
  mimeTypeB?: string;
  imageUrlB?: string | null;
  model?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const PRODUCT_PROMPT = `You are an expert product intelligence analyst. First, identify the product in the image (brand, model, variant). Then generate a comprehensive, well-researched product report.

Return ONLY valid JSON, no markdown fences, no commentary. Use this exact schema. Use empty string "" or empty array [] for unknown fields — never null. Provide rich, factual content totalling 500–1000+ words across the textual fields when enough information is available.

{
  "basic_information": {
    "product_name": string,
    "brand": string,
    "manufacturer": string,
    "model_number": string,
    "category": string,
    "product_type": string,
    "confidence": number
  },
  "company_information": {
    "company_name": string,
    "founders": string[],
    "ceo": string,
    "country_of_origin": string,
    "official_website": string,
    "year_founded": string
  },
  "product_history": {
    "launch_year": string,
    "release_date": string,
    "generation": string,
    "previous_model": string,
    "successor_model": string
  },
  "pricing": {
    "current_market_price": string,
    "launch_price": string,
    "estimated_price_range": string,
    "currency": string,
    "availability_status": string
  },
  "description": {
    "overview": string,
    "intended_use": string,
    "target_audience": string,
    "key_selling_points": string[]
  },
  "specifications": { [key: string]: string },
  "features": {
    "main_features": string[],
    "premium_features": string[],
    "safety_features": string[],
    "smart_features": string[]
  },
  "pros_cons": {
    "advantages": string[],
    "limitations": string[]
  },
  "competitors": {
    "similar_products": string[],
    "alternative_models": string[],
    "comparison_summary": string
  },
  "market_analysis": {
    "popularity": string,
    "customer_rating": string,
    "market_position": string,
    "best_use_cases": string[]
  },
  "additional_information": {
    "warranty": string,
    "service_network": string,
    "spare_parts_availability": string,
    "awards_certifications": string[]
  },
  "sources": string[],
  "confidence_notes": string,
  "confidence": number
}

SPECIFICATIONS RULES:
- Choose spec keys appropriate to the product type. Examples:
  - Motorcycles: Engine, Power, Torque, Top Speed, Fuel Tank, Mileage, Transmission, Weight, Suspension, Brakes
  - Phones: Display, Processor, RAM, Storage, Camera, Battery, OS
  - Laptops: CPU, GPU, RAM, Storage, Display, Battery, Weight
- Use human-readable keys with spaces (e.g. "Top Speed", not "top_speed").

If you cannot verify exact figures, provide best-known typical values and explain in "confidence_notes". Lower the top-level "confidence" accordingly. Never invent fake URLs — leave official_website empty if unsure.`;

export const AI_DETECT_PROMPT = `You are a forensic AI-image and manipulation analyst. Examine the image meticulously for signs of AI generation OR manipulation.
Analyze each of these dimensions: face inconsistencies, hand/finger anomalies, lighting mismatches, reflection issues, background artifacts, texture abnormalities, object inconsistencies, and digital edit traces (clone-stamp, splicing, warp).
Return ONLY valid JSON, no markdown, no commentary. Probabilities are percentages 0-100. "confidence" is 0-1.
{
  "verdict": "ai_generated" | "real" | "uncertain",
  "ai_probability": number,
  "human_probability": number,
  "confidence": number,
  "likely_model": string,
  "reasoning": string,
  "indicators": string[],
  "manipulation_analysis": {
    "face_inconsistencies": string,
    "hand_finger_anomalies": string,
    "lighting_mismatches": string,
    "reflection_issues": string,
    "background_artifacts": string,
    "texture_abnormalities": string,
    "object_inconsistencies": string
  },
  "suspicious_areas": [
    { "region": string, "description": string, "x_pct": number, "y_pct": number, "w_pct": number, "h_pct": number, "severity": "low" | "medium" | "high" }
  ]
}
Region coordinates are percentages (0-100) of image width/height from top-left. If you cannot localize, return an empty suspicious_areas array.`;

export const FAKE_DETECT_PROMPT = `You are a brand-protection and counterfeit-detection expert. Inspect the product image for authenticity.
Evaluate: logo quality and kerning, branding consistency, packaging quality, label print and alignment, product markings, serial/batch numbers if visible, materials/finish, stitching/seams, and design inconsistencies vs. genuine references.
Return ONLY valid JSON, no markdown, no commentary:
{
  "product_guess": { "name": string, "brand": string, "category": string },
  "authenticity_score": number,        // 0-100, higher = more authentic
  "counterfeit_probability": number,   // 0-100
  "confidence": number,                // 0-1
  "risk_level": "genuine" | "suspicious" | "likely_counterfeit",
  "summary": string,
  "reasoning": string,
  "suspicious_findings": [ { "area": string, "issue": string, "severity": "low" | "medium" | "high" } ],
  "checks": {
    "logo_quality": string,
    "branding_consistency": string,
    "packaging_quality": string,
    "label_consistency": string,
    "product_markings": string,
    "serial_numbers": string,
    "design_inconsistencies": string
  },
  "recommendation": string
}`;

export const COMPARE_PROMPT = `You are an expert product analyst. You will receive TWO product images (Product A first, Product B second). Identify each and produce a thorough side-by-side comparison.
Return ONLY valid JSON, no markdown:
{
  "product_a": { "name": string, "brand": string, "model": string, "category": string, "launch_year": string, "market_price": string, "key_specs": { [k:string]: string }, "key_features": string[], "pros": string[], "cons": string[] },
  "product_b": { "name": string, "brand": string, "model": string, "category": string, "launch_year": string, "market_price": string, "key_specs": { [k:string]: string }, "key_features": string[], "pros": string[], "cons": string[] },
  "spec_comparison": [ { "label": string, "a": string, "b": string } ],
  "feature_comparison": [ { "label": string, "a": string, "b": string } ],
  "price_comparison": { "a": string, "b": string, "verdict": string },
  "value_for_money": { "a_score": number, "b_score": number, "explanation": string },
  "winner": "a" | "b" | "tie",
  "winner_reason": string,
  "recommendation": string,
  "confidence": number
}
Scores are 0-10. Use the SAME spec_comparison keys across both products so the table aligns.`;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseGeminiJson(content: string): { [k: string]: Json } {
  try {
    return JSON.parse(content) as { [k: string]: Json };
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return { raw: content };
    try {
      return JSON.parse(match[0]) as { [k: string]: Json };
    } catch {
      return { raw: content };
    }
  }
}

function getConfidence(result: { [k: string]: Json }) {
  const direct = Number(result.confidence ?? 0);
  const basic = result.basic_information;
  const nested = typeof basic === "object" && basic && !Array.isArray(basic)
    ? Number(basic.confidence ?? 0)
    : 0;
  const confidence = Number.isFinite(direct) && direct > 0 ? direct : nested;
  return Number.isFinite(confidence) ? confidence : 0;
}

async function getAuthenticatedClient(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing Authorization bearer token");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new HttpError(500, "Supabase environment variables are not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, "Invalid Supabase authorization token");
  }

  return { supabase, userId: data.user.id };
}

type ImagePart = { imageBase64: string; mimeType: string };

async function callGeminiVision(prompt: string, images: ImagePart[], modelName = "gemini-3.1-flash-lite") {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  console.log(`[Gemini] GEMINI_API_KEY configured: ${Boolean(apiKey)}`);
  if (!apiKey) throw new HttpError(500, "GEMINI_API_KEY is not configured");

  // Fetch available models to diagnose which models are allowed
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const img of images) parts.push({ inline_data: { mime_type: img.mimeType, data: img.imageBase64 } });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Gemini] API request failed", { status: response.status, body: text.slice(0, 1200) });
    if (response.status === 429) throw new HttpError(429, `Gemini rate limit exceeded: ${text}`);
    if (response.status === 401 || response.status === 403) throw new HttpError(502, `Gemini API key invalid or unauthorized: ${text}`);
    throw new HttpError(502, `Gemini API error (${response.status}): ${text}`);
  }

  const json = await response.json();
  const responseParts = json?.candidates?.[0]?.content?.parts ?? [];
  const content = responseParts.map((part: { text?: string }) => part?.text ?? "").join("") || "{}";
  return parseGeminiJson(content);
}

export async function handleAnalyzeRequest(req: Request, mode: AnalyzeMode, prompt: string) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    console.log(`[${mode}] Request received`);
    const body = (await req.json()) as AnalyzeRequestBody;
    const imageBase64 = body.imageBase64?.trim();
    const mimeType = body.mimeType || "image/jpeg";
    if (!imageBase64 || imageBase64.length < 10) {
      throw new HttpError(400, "imageBase64 is required");
    }
    const images: ImagePart[] = [{ imageBase64, mimeType }];
    if (mode === "product_comparison") {
      const imageBase64B = body.imageBase64B?.trim();
      if (!imageBase64B || imageBase64B.length < 10) throw new HttpError(400, "imageBase64B is required for comparison");
      images.push({ imageBase64: imageBase64B, mimeType: body.mimeTypeB || "image/jpeg" });
    }

    const { supabase, userId } = await getAuthenticatedClient(req);
    console.log(`[${mode}] Authenticated request for user ${userId}`);

    const result = await callGeminiVision(prompt, images, body.model || "gemini-3.1-flash-lite");
    if (mode === "product_comparison") {
      (result as Record<string, Json>).image_a_url = body.imageUrl ?? null;
      (result as Record<string, Json>).image_b_url = body.imageUrlB ?? null;
    }
    const confidence = getConfidence(result);
    console.log(`[${mode}] Gemini analysis succeeded`, { confidence });

    const { data: row, error } = await supabase
      .from("analysis_history")
      .insert({
        user_id: userId,
        analysis_type: mode,
        image_url: body.imageUrl ?? null,
        result,
        confidence_score: Number.isFinite(confidence) ? confidence : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`[${mode}] Failed to store analysis result`, error);
      throw new HttpError(500, "Failed to store analysis result");
    }

    console.log(`[${mode}] Stored analysis result`, { historyId: row.id });
    return jsonResponse({ result, historyId: row.id, confidence, provider: "google-gemini", model: "gemini-3.1-flash-lite" });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error(`[${mode}] Request failed`, { status, message });
    return jsonResponse({ error: message }, status);
  }
}