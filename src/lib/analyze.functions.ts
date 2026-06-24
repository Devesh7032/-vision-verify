import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AnalyzeInput = z.object({
  imageBase64: z.string().min(10),
  mimeType: z.string().default("image/jpeg"),
  mode: z.enum(["product_recognition", "ai_detection", "fake_detection"]),
  imageUrl: z.string().optional(),
});

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

type EdgeAnalyzeResponse = {
  result: Json;
  historyId: string;
  confidence: number;
  provider: "google-gemini";
  model: "gemini-1.5-flash" | "gemini-2.5-flash" | "gemini-3.1-flash-lite";
};

export const analyzeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const functionName =
      data.mode === "product_recognition" ? "analyze-product"
      : data.mode === "fake_detection" ? "detect-fake"
      : "detect-ai";
    console.log(`[Analyze] Invoking Supabase Edge Function: ${functionName}`);

    const { data: edgeData, error } = await context.supabase.functions.invoke<EdgeAnalyzeResponse>(functionName, {
      body: {
        imageBase64: data.imageBase64,
        mimeType: data.mimeType,
        imageUrl: data.imageUrl ?? null,
      },
    });

    if (error) {
      console.error(`[Analyze] Edge Function ${functionName} failed`, error);
      throw new Error(error.message || `${functionName} failed`);
    }

    if (!edgeData?.result) {
      throw new Error(`${functionName} returned an empty analysis result`);
    }

    return edgeData;
  });

const CompareInput = z.object({
  imageBase64: z.string().min(10),
  mimeType: z.string().default("image/jpeg"),
  imageUrl: z.string().optional(),
  imageBase64B: z.string().min(10),
  mimeTypeB: z.string().default("image/jpeg"),
  imageUrlB: z.string().optional(),
});

export const compareProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompareInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: edgeData, error } = await context.supabase.functions.invoke<EdgeAnalyzeResponse>("compare-products", {
      body: {
        imageBase64: data.imageBase64,
        mimeType: data.mimeType,
        imageUrl: data.imageUrl ?? null,
        imageBase64B: data.imageBase64B,
        mimeTypeB: data.mimeTypeB,
        imageUrlB: data.imageUrlB ?? null,
      },
    });
    if (error) {
      console.error("[Compare] Edge function invoke error:", error);
      if (error.context && typeof error.context.text === 'function') {
        try {
          const bodyText = await error.context.text();
          console.error("[Compare] Edge function response body:", bodyText);
        } catch (readErr) {
          console.error("[Compare] Failed to read edge function response body:", readErr);
        }
      }
      throw new Error(error.message || "compare-products failed");
    }
    if (!edgeData?.result) throw new Error("compare-products returned empty result");
    return edgeData;
  });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("analysis_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });