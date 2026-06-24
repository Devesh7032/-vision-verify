import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyzeImage } from "@/lib/analyze.functions";
import { AppShell } from "@/components/app-shell";
import { ImageInput, dataUrlToBase64, uploadImageToStorage, type ImagePicked } from "@/components/image-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ShieldCheck, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultActions } from "@/components/result-actions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-detection")({
  head: () => ({ meta: [{ title: "AI Detection — VisionVerify AI" }] }),
  component: AiDetectionPage,
});

type DetectResult = {
  verdict?: "ai_generated" | "real" | "uncertain";
  ai_probability?: number; human_probability?: number; confidence?: number;
  indicators?: string[]; reasoning?: string; likely_model?: string;
  manipulation_analysis?: Record<string, string>;
  suspicious_areas?: { region?: string; description?: string; x_pct?: number; y_pct?: number; w_pct?: number; h_pct?: number; severity?: "low" | "medium" | "high" }[];
};

function AiDetectionPage() {
  const [picked, setPicked] = useState<ImagePicked | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const analyzeFn = useServerFn(analyzeImage);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error("Pick an image first");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const imageUrl = await uploadImageToStorage(picked.file, u.user.id, "analysis-images");
      return analyzeFn({
        data: {
          imageBase64: dataUrlToBase64(picked.dataUrl),
          mimeType: picked.file.type || "image/jpeg",
          mode: "ai_detection",
          imageUrl: imageUrl ?? undefined,
        },
      });
    },
    onSuccess: (r) => {
      setResult(r.result as DetectResult);
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Analysis complete");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
          <ShieldCheck className="size-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Image Detection</h1>
          <p className="text-sm text-muted-foreground">Determine whether an image is AI-generated or real.</p>
        </div>
      </div>

      <Card className="backdrop-blur-xl border-border/50 mb-6">
        <CardContent className="p-6 space-y-4">
          <ImageInput value={picked} onChange={(v) => { setPicked(v); setResult(null); }} />
          <Button
            disabled={!picked || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="w-full"
            style={{ background: "var(--gradient-accent)" }}
          >
            {mutation.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Analyzing…</> : <><Sparkles className="size-4 mr-2" /> Detect AI</>}
          </Button>
        </CardContent>
      </Card>

      {mutation.isPending && (
        <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div>
      )}
      {result && <ResultCard r={result} imageUrl={picked?.dataUrl} />}
    </AppShell>
  );
}

function ResultCard({ r, imageUrl }: { r: DetectResult; imageUrl?: string }) {
  const v = r.verdict ?? "uncertain";
  const palette = v === "ai_generated"
    ? { Icon: AlertTriangle, label: "AI-Generated", color: "text-destructive", bg: "bg-destructive/10" }
    : v === "real"
      ? { Icon: CheckCircle2, label: "Likely Real", color: "text-primary", bg: "bg-primary/10" }
      : { Icon: HelpCircle, label: "Uncertain", color: "text-muted-foreground", bg: "bg-muted/40" };
  // Probabilities arrive as either 0-1 or 0-100; normalize.
  const norm = (n?: number) => typeof n === "number" ? (n <= 1 ? n * 100 : n) : null;
  const ai = norm(r.ai_probability);
  const human = norm(r.human_probability) ?? (ai != null ? 100 - ai : null);
  const aiPct = ai != null ? `${Math.round(ai)}%` : "—";
  const humanPct = human != null ? `${Math.round(human)}%` : "—";
  const confPct = typeof r.confidence === "number" ? (r.confidence * 100).toFixed(0) : "—";

  return (
    <div className="space-y-6 animate-fade-in">
    <Card className="backdrop-blur-xl border-border/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className={`flex items-center gap-3 p-4 rounded-xl ${palette.bg}`}>
            <palette.Icon className={`size-8 ${palette.color}`} />
            <div>
              <p className={`text-xl font-bold ${palette.color}`}>{palette.label}</p>
              <p className="text-sm text-muted-foreground">AI: {aiPct} · Human: {humanPct} · Confidence: {confPct}%</p>
            </div>
          </div>
          <ResultActions data={r} title="AI Detection Result" />
        </div>

        {imageUrl && r.suspicious_areas && r.suspicious_areas.length > 0 && (
          <div className="relative inline-block max-w-full">
            <img src={imageUrl} alt="" className="max-h-96 rounded-lg" />
            {r.suspicious_areas.map((area, i) => {
              if (area.x_pct == null || area.y_pct == null) return null;
              const borderColor = area.severity === "high" ? "border-destructive" : area.severity === "medium" ? "border-amber-400" : "border-primary";
              return (
                <div key={i}
                  className={`absolute border-2 ${borderColor} rounded-md pointer-events-none animate-fade-in`}
                  style={{
                    left: `${area.x_pct}%`, top: `${area.y_pct}%`,
                    width: `${area.w_pct ?? 10}%`, height: `${area.h_pct ?? 10}%`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0)",
                  }}
                  title={area.description}
                />
              );
            })}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <ProbBar label="AI probability" value={ai ?? 0} tone="destructive" />
          <ProbBar label="Human probability" value={human ?? 0} tone="primary" />
          <ProbBar label="Confidence" value={typeof r.confidence === "number" ? r.confidence * 100 : 0} tone="accent" />
        </div>

        {r.reasoning && (
          <div>
            <h3 className="font-semibold mb-1">Reasoning</h3>
            <p className="text-sm text-muted-foreground">{r.reasoning}</p>
          </div>
        )}
        {r.indicators && r.indicators.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Detected indicators</h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              {r.indicators.map((i, idx) => <li key={idx}>{i}</li>)}
            </ul>
          </div>
        )}
        {r.likely_model && r.likely_model !== "n/a" && (
          <p className="text-sm"><span className="text-muted-foreground">Likely model:</span> <span className="font-medium">{r.likely_model}</span></p>
        )}
      </CardContent>
    </Card>

    {r.manipulation_analysis && Object.values(r.manipulation_analysis).some(Boolean) && (
      <Card className="backdrop-blur-xl border-border/50">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold">Manipulation analysis</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {Object.entries(r.manipulation_analysis).map(([k, v]) => v ? (
              <div key={k} className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                <p>{String(v)}</p>
              </div>
            ) : null)}
          </div>
        </CardContent>
      </Card>
    )}

    {r.suspicious_areas && r.suspicious_areas.length > 0 && (
      <Card className="backdrop-blur-xl border-border/50">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold">Suspicious areas</h3>
          <ul className="space-y-2">
            {r.suspicious_areas.map((s, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Badge variant={s.severity === "high" ? "destructive" : "secondary"}>{s.severity ?? "info"}</Badge>
                <div className="text-sm">
                  <p className="font-medium">{s.region}</p>
                  <p className="text-muted-foreground">{s.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}
    </div>
  );
}

function ProbBar({ label, value, tone }: { label: string; value: number; tone: "primary" | "destructive" | "accent" }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone === "destructive" ? "bg-destructive" : tone === "accent" ? "bg-accent" : "bg-primary";
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span><span>{Math.round(v)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}