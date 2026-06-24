import { handleAnalyzeRequest, PRODUCT_PROMPT } from "../_shared/analyze.ts";

Deno.serve((req) => handleAnalyzeRequest(req, "product_recognition", PRODUCT_PROMPT));