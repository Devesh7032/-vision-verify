ALTER TABLE public.analysis_history
DROP CONSTRAINT IF EXISTS analysis_history_analysis_type_check;

ALTER TABLE public.analysis_history
ADD CONSTRAINT analysis_history_analysis_type_check
CHECK (analysis_type IN ('product_recognition', 'ai_detection', 'fake_detection', 'product_comparison'));
