import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHistory } from "@/lib/analyze.functions";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { ScanSearch, ShieldCheck, History, ArrowRight, GitCompareArrows, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — VisionVerify AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchHistory = useServerFn(listHistory);
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(),
  });

  const productCount = history.filter((h) => h.analysis_type === "product_recognition").length;
  const aiCount = history.filter((h) => h.analysis_type === "ai_detection").length;
  const fakeCount = history.filter((h) => h.analysis_type === "fake_detection").length;
  const compareCount = history.filter((h) => h.analysis_type === "product_comparison").length;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Pick an analysis to start, or review your recent results.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <FeatureCard to="/product-recognition" title="Product Recognition" desc="Identify any product instantly" icon={ScanSearch} gradient="var(--gradient-primary)" />
        <FeatureCard to="/product-comparison" title="Product Comparison" desc="Compare two products side-by-side" icon={GitCompareArrows} gradient="var(--gradient-primary)" />
        <FeatureCard to="/fake-detector" title="Fake Product Detector" desc="Spot counterfeits and fakes" icon={ShieldAlert} gradient="var(--gradient-accent)" />
        <FeatureCard to="/ai-detection" title="AI Detection" desc="Real, AI-generated, or manipulated?" icon={ShieldCheck} gradient="var(--gradient-accent)" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Total analyses" value={history.length} />
        <Stat label="Products recognized" value={productCount} />
        <Stat label="Fake checks" value={fakeCount} />
        <Stat label="AI detections" value={aiCount} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Stat label="Comparisons run" value={compareCount} />
        <Link to="/dashboard">
          <Card className="backdrop-blur-xl border-border/50 hover:scale-[1.01] transition-transform cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-3"><History className="size-5 text-primary" /><div><p className="text-sm text-muted-foreground">Analysis history</p><p className="text-lg font-semibold">{history.length} items</p></div></CardContent>
          </Card>
        </Link>
      </div>

      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><History className="size-5" /> Recent activity</h2>
      <Card className="backdrop-blur-xl border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : history.length === 0 ? (
            <div className="p-6 text-muted-foreground text-center">No analyses yet. Run your first one above.</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {history.slice(0, 10).map((h) => {
                const r = (h.result ?? {}) as Record<string, unknown>;
                const title = h.analysis_type === "product_recognition"
                  ? String(r.product_name ?? "Unknown product")
                  : h.analysis_type === "ai_detection"
                    ? `Verdict: ${String(r.verdict ?? "n/a")}`
                    : h.analysis_type === "fake_detection"
                      ? `Authenticity: ${String(r.authenticity_score ?? "?")}% (${String(r.risk_level ?? "")})`
                      : h.analysis_type === "product_comparison"
                        ? `Comparison: ${String((r.product_a as Record<string, unknown> | undefined)?.name ?? "A")} vs ${String((r.product_b as Record<string, unknown> | undefined)?.name ?? "B")}`
                        : "Analysis";
                return (
                  <li key={h.id} className="flex items-center gap-4 p-4">
                    {h.image_url ? (
                      <img src={h.image_url} alt="" className="size-12 rounded object-cover" />
                    ) : (
                      <div className="size-12 rounded bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{title}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelForType(h.analysis_type)} ·{" "}
                        {new Date(h.created_at).toLocaleString()}
                      </p>
                    </div>
                    {h.confidence_score != null && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {(Number(h.confidence_score) * 100).toFixed(0)}%
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="backdrop-blur-xl border-border/50">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function FeatureCard({ to, title, desc, icon: Icon, gradient }: { to: string; title: string; desc: string; icon: typeof ScanSearch; gradient: string }) {
  return (
    <Link to={to}>
      <Card className="backdrop-blur-xl border-border/50 hover:scale-[1.02] transition-transform cursor-pointer h-full">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: gradient }}>
            <Icon className="size-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

function labelForType(t: string) {
  switch (t) {
    case "product_recognition": return "Product Recognition";
    case "ai_detection": return "AI Detection";
    case "fake_detection": return "Fake Detector";
    case "product_comparison": return "Comparison";
    default: return t;
  }
}