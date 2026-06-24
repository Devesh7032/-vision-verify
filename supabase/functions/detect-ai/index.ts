import { AI_DETECT_PROMPT, handleAnalyzeRequest } from "../_shared/analyze.ts";

Deno.serve((req) => handleAnalyzeRequest(req, "ai_detection", AI_DETECT_PROMPT));