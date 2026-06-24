import { FAKE_DETECT_PROMPT, handleAnalyzeRequest } from "../_shared/analyze.ts";

Deno.serve((req) => handleAnalyzeRequest(req, "fake_detection", FAKE_DETECT_PROMPT));