import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { compareProducts } from "@/lib/analyze.functions";
import { AppShell } from "@/components/app-shell";
import { ImageInput, dataUrlToBase64, uploadImageToStorage, type ImagePicked } from "@/components/image-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultActions } from "@/components/result-actions";
import { Loader2, Sparkles, GitCompareArrows, Trophy, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/product-comparison")({
  head: () => ({ meta: [{ title: "Product Comparison — VisionVerify AI" }] }),
  component: ProductComparisonPage,
});

type ProductSide = {
  name?: string; brand?: string; model?: string; category?: string;
  launch_year?: string; market_price?: string;
  key_specs?: Record<string, string>;
  key_features?: string[]; pros?: string[]; cons?: string[];
};

type CompareResult = {
  product_a?: ProductSide;
  product_b?: ProductSide;
  spec_comparison?: { label: string; a: string; b: string }[];
  feature_comparison?: { label: string; a: string; b: string }[];
  price_comparison?: { a?: string; b?: string; verdict?: string };
  value_for_money?: { a_score?: number; b_score?: number; explanation?: string };
  winner?: "a" | "b" | "tie";
  winner_reason?: string;
  recommendation?: string;
  confidence?: number;
  image_a_url?: string | null;
  image_b_url?: string | null;
};

function ProductComparisonPage() {
  const [a, setA] = useState<ImagePicked | null>(null);
  const [b, setB] = useState<ImagePicked | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const compareFn = useServerFn(compareProducts);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!a || !b) throw new Error("Pick two product images");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      
      const [urlA, urlB] = await Promise.all([
        uploadImageToStorage(a.file, u.user.id, "analysis-images"),
        uploadImageToStorage(b.file, u.user.id, "analysis-images"),
      ]);

      console.log("[Compare] Image A upload URL:", urlA);
      console.log("[Compare] Image B upload URL:", urlB);

      if (!urlA || !urlB) {
        throw new Error("Failed to retrieve image URLs from storage. Please try again.");
      }

      const payload = {
        imageBase64: dataUrlToBase64(a.dataUrl),
        mimeType: a.file.type || "image/jpeg",
        imageUrl: urlA,
        imageBase64B: dataUrlToBase64(b.dataUrl),
        mimeTypeB: b.file.type || "image/jpeg",
        imageUrlB: urlB,
      };

      console.log("[Compare] Request Payload:", payload);
      const res = await compareFn({ data: payload });
      console.log("[Compare] Response:", res);
      return res;
    },
    onSuccess: (r) => {
      setResult(r.result as CompareResult);
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Comparison complete");
    },
    onError: (e: unknown) => {
      console.error("[Compare] Error during comparison:", e);
      toast.error(e instanceof Error ? e.message : "Comparison failed");
    },
  });

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <GitCompareArrows className="size-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Product Comparison</h1>
          <p className="text-sm text-muted-foreground">Upload two products and let AI declare a winner.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card className="backdrop-blur-xl border-border/50">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Product A</p>
            <ImageInput value={a} onChange={(v) => { setA(v); setResult(null); }} />
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl border-border/50">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Product B</p>
            <ImageInput value={b} onChange={(v) => { setB(v); setResult(null); }} />
          </CardContent>
        </Card>
      </div>

      <Button
        disabled={!a || !b || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="w-full mb-6"
        style={{ background: "var(--gradient-primary)" }}
      >
        {mutation.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Comparing…</> : <><Sparkles className="size-4 mr-2" /> Compare products</>}
      </Button>

      {mutation.isPending && (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
      {result && <ComparisonReport r={result} />}
    </AppShell>
  );
}

function ComparisonReport({ r }: { r: CompareResult }) {
  const a = r.product_a ?? {};
  const b = r.product_b ?? {};
  const winner = r.winner ?? "tie";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Trophy className="size-5 text-amber-400" /> Result</h2>
        <ResultActions data={r} title="Product Comparison" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SideCard product={a} imageUrl={r.image_a_url} side="A" winning={winner === "a"} score={r.value_for_money?.a_score} />
        <SideCard product={b} imageUrl={r.image_b_url} side="B" winning={winner === "b"} score={r.value_for_money?.b_score} />
      </div>

      {r.spec_comparison && r.spec_comparison.length > 0 && (
        <ComparisonTable title="Specifications" rows={r.spec_comparison} />
      )}
      {r.feature_comparison && r.feature_comparison.length > 0 && (
        <ComparisonTable title="Features" rows={r.feature_comparison} />
      )}

      {r.price_comparison && (
        <Card className="backdrop-blur-xl border-border/50">
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">Price comparison</h3>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/30"><p className="text-xs text-muted-foreground">Product A</p><p className="font-medium">{r.price_comparison.a || "—"}</p></div>
              <div className="p-3 rounded-lg bg-muted/30"><p className="text-xs text-muted-foreground">Product B</p><p className="font-medium">{r.price_comparison.b || "—"}</p></div>
              <div className="p-3 rounded-lg bg-primary/10"><p className="text-xs text-muted-foreground">Verdict</p><p className="font-medium">{r.price_comparison.verdict || "—"}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <ProsConsCard side="A" pros={a.pros} cons={a.cons} />
        <ProsConsCard side="B" pros={b.pros} cons={b.cons} />
      </div>

      <Card className="backdrop-blur-xl border-border/50">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Trophy className="size-6 text-amber-400" />
            <div>
              <p className="text-sm text-muted-foreground">Winner</p>
              <p className="text-xl font-bold">
                {winner === "a" ? a.name || "Product A" : winner === "b" ? b.name || "Product B" : "Tie"}
              </p>
            </div>
          </div>
          {r.winner_reason && <p className="text-sm text-muted-foreground">{r.winner_reason}</p>}
          {r.value_for_money?.explanation && (
            <p className="text-sm"><span className="text-muted-foreground">Value for money: </span>{r.value_for_money.explanation}</p>
          )}
          {r.recommendation && (
            <div className="p-3 rounded-lg bg-primary/10 text-sm">
              <span className="font-semibold">Recommendation: </span>{r.recommendation}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SideCard({ product, imageUrl, side, winning, score }: { product: ProductSide; imageUrl?: string | null; side: string; winning: boolean; score?: number }) {
  return (
    <Card className={`backdrop-blur-xl border-border/50 ${winning ? "ring-2 ring-amber-400/60" : ""}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">Product {side}</Badge>
          {winning && <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40"><Trophy className="size-3 mr-1" /> Winner</Badge>}
        </div>
        {imageUrl && <img src={imageUrl} alt={product.name || ""} className="w-full max-h-56 object-contain rounded-lg bg-black/30" />}
        <div>
          <p className="font-bold text-lg">{product.name || "Unknown"}</p>
          <p className="text-sm text-muted-foreground">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {product.category && <Badge variant="outline">{product.category}</Badge>}
          {product.launch_year && <Badge variant="outline">{product.launch_year}</Badge>}
          {product.market_price && <Badge variant="outline">{product.market_price}</Badge>}
        </div>
        {typeof score === "number" && (
          <div className="text-sm"><span className="text-muted-foreground">Value score: </span><span className="font-semibold">{score.toFixed(1)}/10</span></div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ title, rows }: { title: string; rows: { label: string; a: string; b: string }[] }) {
  return (
    <Card className="backdrop-blur-xl border-border/50">
      <CardContent className="p-6 space-y-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Attribute</th>
                <th className="text-left px-4 py-2 font-medium">Product A</th>
                <th className="text-left px-4 py-2 font-medium">Product B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                  <td className="px-4 py-2 text-muted-foreground font-medium">{row.label}</td>
                  <td className="px-4 py-2">{row.a}</td>
                  <td className="px-4 py-2">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ProsConsCard({ side, pros, cons }: { side: string; pros?: string[]; cons?: string[] }) {
  return (
    <Card className="backdrop-blur-xl border-border/50">
      <CardContent className="p-5 space-y-3">
        <h3 className="font-semibold">Product {side} — Pros & Cons</h3>
        {pros && pros.length > 0 && (
          <div>
            <p className="text-xs font-medium text-primary flex items-center gap-1 mb-1"><ThumbsUp className="size-3" /> Pros</p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">{pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        )}
        {cons && cons.length > 0 && (
          <div>
            <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1"><ThumbsDown className="size-3" /> Cons</p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">{cons.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}