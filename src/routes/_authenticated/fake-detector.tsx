import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyzeImage } from "@/lib/analyze.functions";
import { AppShell } from "@/components/app-shell";
import { ImageInput, dataUrlToBase64, uploadImageToStorage, type ImagePicked } from "@/components/image-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultActions } from "@/components/result-actions";
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fake-detector")({
  head: () => ({ meta: [{ title: "Fake Product Detector — VisionVerify AI" }] }),
  component: FakeDetectorPage,
});

type FakeResult = {
  product_guess?: { name?: string; brand?: string; category?: string };
  authenticity_score?: number;
  counterfeit_probability?: number;
  confidence?: number;
  risk_level?: "genuine" | "suspicious" | "likely_counterfeit";
  summary?: string;
  reasoning?: string;
  suspicious_findings?: { area?: string; issue?: string; severity?: "low" | "medium" | "high" }[];
  checks?: Record<string, string>;
  recommendation?: string;
};

function FakeDetectorPage() {
  const [picked, setPicked] = useState<ImagePicked | null>(null);
  const [result, setResult] = useState<FakeResult | null>(null);
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
          mode: "fake_detection",
          imageUrl: imageUrl ?? undefined,
        },
      });
    },
    onSuccess: (r) => {
      setResult(r.result as FakeResult);
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Scan complete");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Scan failed"),
  });

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
          <ShieldAlert className="size-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Fake Product Detector</h1>
          <p className="text-sm text-muted-foreground">Spot counterfeits by analyzing packaging, logos, and markings.</p>
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
            {mutation.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Scanning…</> : <><Sparkles className="size-4 mr-2" /> Scan authenticity</>}
          </Button>
        </CardContent>
      </Card>

      {mutation.isPending && <ResultSkeleton />}
      {result && <FakeReport r={result} />}
    </AppShell>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function FakeReport({ r }: { r: FakeResult }) {
  const score = typeof r.authenticity_score === "number" ? Math.max(0, Math.min(100, r.authenticity_score)) : 0;
  const risk = r.risk_level ?? (score >= 75 ? "genuine" : score >= 45 ? "suspicious" : "likely_counterfeit");
  const palette = risk === "genuine"
    ? { Icon: CheckCircle2, label: "Genuine", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" }
    : risk === "suspicious"
    ? { Icon: AlertTriangle, label: "Suspicious", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" }
    : { Icon: XCircle, label: "Likely Counterfeit", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/40" };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className={`backdrop-blur-xl border ${palette.border}`}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className={`flex items-center gap-3 p-3 rounded-xl ${palette.bg}`}>
              <palette.Icon className={`size-8 ${palette.color}`} />
              <div>
                <p className={`text-xl font-bold ${palette.color}`}>{palette.label}</p>
                <p className="text-xs text-muted-foreground">
                  {r.product_guess?.brand} {r.product_guess?.name}
                </p>
              </div>
            </div>
            <ResultActions data={r} title="Fake Product Scan" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Metric label="Authenticity" value={`${score}%`} progress={score} tone="primary" />
            <Metric label="Counterfeit probability" value={`${r.counterfeit_probability ?? Math.max(0, 100 - score)}%`} progress={r.counterfeit_probability ?? Math.max(0, 100 - score)} tone="destructive" />
            <Metric label="Confidence" value={`${Math.round((r.confidence ?? 0) * 100)}%`} progress={(r.confidence ?? 0) * 100} tone="accent" />
          </div>

          {r.summary && <p className="text-sm text-muted-foreground">{r.summary}</p>}
        </CardContent>
      </Card>

      {r.suspicious_findings && r.suspicious_findings.length > 0 && (
        <Card className="backdrop-blur-xl border-border/50">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="size-4 text-amber-400" /> Suspicious findings</h3>
            <ul className="space-y-2">
              {r.suspicious_findings.map((f, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge variant={f.severity === "high" ? "destructive" : "secondary"} className="mt-0.5">{f.severity ?? "info"}</Badge>
                  <div className="text-sm">
                    <p className="font-medium">{f.area}</p>
                    <p className="text-muted-foreground">{f.issue}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {r.checks && Object.keys(r.checks).length > 0 && (
        <Card className="backdrop-blur-xl border-border/50">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold">Inspection checks</h3>
            <div className="overflow-hidden rounded-lg border border-border/50">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(r.checks).map(([k, v], i) => (
                    <tr key={k} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="px-4 py-2 text-muted-foreground font-medium capitalize w-1/3">{k.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(r.reasoning || r.recommendation) && (
        <Card className="backdrop-blur-xl border-border/50">
          <CardContent className="p-6 space-y-3 text-sm">
            {r.reasoning && (<div><h3 className="font-semibold mb-1">Reasoning</h3><p className="text-muted-foreground">{r.reasoning}</p></div>)}
            {r.recommendation && (<div><h3 className="font-semibold mb-1">Recommendation</h3><p className="text-muted-foreground">{r.recommendation}</p></div>)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, progress, tone }: { label: string; value: string; progress: number; tone: "primary" | "destructive" | "accent" }) {
  const barColor = tone === "destructive" ? "bg-destructive" : tone === "accent" ? "bg-accent" : "bg-primary";
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mb-2">{value}</p>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}