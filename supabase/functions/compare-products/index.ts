import { COMPARE_PROMPT, handleAnalyzeRequest } from "../_shared/analyze.ts";

Deno.serve((req) => handleAnalyzeRequest(req, "product_comparison", COMPARE_PROMPT));