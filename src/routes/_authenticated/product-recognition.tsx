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
import {
  Loader2, Sparkles, ScanSearch, Building2, History, Tag, FileText, Cpu, Star,
  ThumbsUp, ThumbsDown, Swords, TrendingUp, ShieldCheck, Globe, Quote,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/product-recognition")({
  head: () => ({ meta: [{ title: "Product Recognition — VisionVerify AI" }] }),
  component: ProductRecognitionPage,
});

type ProductResult = {
  basic_information?: {
    product_name?: string; brand?: string; manufacturer?: string; model_number?: string;
    category?: string; product_type?: string; confidence?: number;
  };
  company_information?: {
    company_name?: string; founders?: string[]; ceo?: string; country_of_origin?: string;
    official_website?: string; year_founded?: string;
  };
  product_history?: {
    launch_year?: string; release_date?: string; generation?: string;
    previous_model?: string; successor_model?: string;
  };
  pricing?: {
    current_market_price?: string; launch_price?: string; estimated_price_range?: string;
    currency?: string; availability_status?: string;
  };
  description?: {
    overview?: string; intended_use?: string; target_audience?: string;
    key_selling_points?: string[];
  };
  specifications?: Record<string, string>;
  features?: {
    main_features?: string[]; premium_features?: string[];
    safety_features?: string[]; smart_features?: string[];
  };
  pros_cons?: { advantages?: string[]; limitations?: string[] };
  competitors?: {
    similar_products?: string[]; alternative_models?: string[]; comparison_summary?: string;
  };
  market_analysis?: {
    popularity?: string; customer_rating?: string; market_position?: string;
    best_use_cases?: string[];
  };
  additional_information?: {
    warranty?: string; service_network?: string; spare_parts_availability?: string;
    awards_certifications?: string[];
  };
  sources?: string[];
  confidence_notes?: string;
  confidence?: number;
};

function ProductRecognitionPage() {
  const [picked, setPicked] = useState<ImagePicked | null>(null);
  const [result, setResult] = useState<ProductResult | null>(null);
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
          mode: "product_recognition",
          imageUrl: imageUrl ?? undefined,
        },
      });
    },
    onSuccess: (r) => {
      setResult(r.result as ProductResult);
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Analysis complete");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <ScanSearch className="size-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Product Recognition</h1>
          <p className="text-sm text-muted-foreground">Snap or upload a product image to get full details.</p>
        </div>
      </div>

      <Card className="backdrop-blur-xl border-border/50 mb-6">
        <CardContent className="p-6 space-y-4">
          <ImageInput value={picked} onChange={(v) => { setPicked(v); setResult(null); }} />
          <Button
            disabled={!picked || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="w-full"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutation.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Analyzing…</> : <><Sparkles className="size-4 mr-2" /> Analyze product</>}
          </Button>
        </CardContent>
      </Card>

      {result && <ProductReport r={result} />}
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="p-3 rounded-lg bg-muted/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}

function Section({
  icon: Icon, title, children,
}: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <Card className="backdrop-blur-xl border-border/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
      {items.map((i, idx) => <li key={idx}>{i}</li>)}
    </ul>
  );
}

function BadgeList({ items, variant = "secondary" }: { items?: string[]; variant?: "secondary" | "outline" | "default" }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i, idx) => <Badge key={idx} variant={variant}>{i}</Badge>)}
    </div>
  );
}

function ProductReport({ r }: { r: ProductResult }) {
  const b = r.basic_information ?? {};
  const c = r.company_information ?? {};
  const h = r.product_history ?? {};
  const p = r.pricing ?? {};
  const d = r.description ?? {};
  const f = r.features ?? {};
  const pc = r.pros_cons ?? {};
  const comp = r.competitors ?? {};
  const m = r.market_analysis ?? {};
  const a = r.additional_information ?? {};
  const overallConf = r.confidence ?? b.confidence;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="backdrop-blur-xl border-border/50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold">{b.product_name || "Unknown product"}</h2>
              <p className="text-muted-foreground">
                {[b.brand, b.manufacturer].filter(Boolean).join(" · ")}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {b.category && <Badge variant="secondary">{b.category}</Badge>}
                {b.product_type && <Badge variant="outline">{b.product_type}</Badge>}
                {b.model_number && <Badge variant="outline">Model {b.model_number}</Badge>}
              </div>
            </div>
            {typeof overallConf === "number" && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Confidence</div>
                <div className="text-2xl font-bold text-primary">{(overallConf * 100).toFixed(0)}%</div>
              </div>
            )}
          </div>
          {d.overview && <p className="mt-4 text-sm leading-relaxed">{d.overview}</p>}
        </CardContent>
      </Card>

      {/* Company */}
      {(c.company_name || c.founders?.length || c.ceo || c.country_of_origin || c.official_website || c.year_founded) && (
        <Section icon={Building2} title="Company information">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Company" value={c.company_name} />
            <Field label="Founder(s)" value={c.founders?.join(", ")} />
            <Field label="CEO" value={c.ceo} />
            <Field label="Country of origin" value={c.country_of_origin} />
            <Field label="Year founded" value={c.year_founded} />
            {c.official_website && (
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">Website</p>
                <a href={c.official_website} target="_blank" rel="noreferrer"
                   className="font-medium text-primary inline-flex items-center gap-1 break-all">
                  <Globe className="size-3.5" /> {c.official_website}
                </a>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* History */}
      {(h.launch_year || h.release_date || h.generation || h.previous_model || h.successor_model) && (
        <Section icon={History} title="Product history">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Launch year" value={h.launch_year} />
            <Field label="Release date" value={h.release_date} />
            <Field label="Generation" value={h.generation} />
            <Field label="Previous model" value={h.previous_model} />
            <Field label="Successor model" value={h.successor_model} />
          </div>
        </Section>
      )}

      {/* Pricing */}
      {(p.current_market_price || p.launch_price || p.estimated_price_range || p.availability_status) && (
        <Section icon={Tag} title="Pricing & availability">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Current market price" value={p.current_market_price} />
            <Field label="Launch price" value={p.launch_price} />
            <Field label="Estimated price range" value={p.estimated_price_range} />
            <Field label="Currency" value={p.currency} />
            <Field label="Availability" value={p.availability_status} />
          </div>
        </Section>
      )}

      {/* Description */}
      {(d.intended_use || d.target_audience || (d.key_selling_points && d.key_selling_points.length > 0)) && (
        <Section icon={FileText} title="Detailed description">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Intended use" value={d.intended_use} />
            <Field label="Target audience" value={d.target_audience} />
          </div>
          {d.key_selling_points && d.key_selling_points.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Key selling points</h4>
              <BulletList items={d.key_selling_points} />
            </div>
          )}
        </Section>
      )}

      {/* Specifications */}
      {r.specifications && Object.keys(r.specifications).length > 0 && (
        <Section icon={Cpu} title="Technical specifications">
          <div className="overflow-hidden rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(r.specifications).map(([k, v], i) => (
                  <tr key={k} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                    <td className="px-4 py-2 text-muted-foreground font-medium w-1/3">{k}</td>
                    <td className="px-4 py-2 break-words">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Features */}
      {(f.main_features?.length || f.premium_features?.length || f.safety_features?.length || f.smart_features?.length) && (
        <Section icon={Star} title="Features">
          {f.main_features && f.main_features.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Main features</h4><BulletList items={f.main_features} /></div>
          )}
          {f.premium_features && f.premium_features.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Premium features</h4><BulletList items={f.premium_features} /></div>
          )}
          {f.safety_features && f.safety_features.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Safety features</h4><BulletList items={f.safety_features} /></div>
          )}
          {f.smart_features && f.smart_features.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Smart features</h4><BulletList items={f.smart_features} /></div>
          )}
        </Section>
      )}

      {/* Pros & cons */}
      {(pc.advantages?.length || pc.limitations?.length) && (
        <div className="grid md:grid-cols-2 gap-6">
          {pc.advantages && pc.advantages.length > 0 && (
            <Section icon={ThumbsUp} title="Advantages"><BulletList items={pc.advantages} /></Section>
          )}
          {pc.limitations && pc.limitations.length > 0 && (
            <Section icon={ThumbsDown} title="Limitations"><BulletList items={pc.limitations} /></Section>
          )}
        </div>
      )}

      {/* Competitors */}
      {(comp.similar_products?.length || comp.alternative_models?.length || comp.comparison_summary) && (
        <Section icon={Swords} title="Competitors">
          {comp.similar_products && comp.similar_products.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Similar products</h4><BadgeList items={comp.similar_products} /></div>
          )}
          {comp.alternative_models && comp.alternative_models.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Alternative models</h4><BadgeList items={comp.alternative_models} variant="outline" /></div>
          )}
          {comp.comparison_summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">{comp.comparison_summary}</p>
          )}
        </Section>
      )}

      {/* Market analysis */}
      {(m.popularity || m.customer_rating || m.market_position || m.best_use_cases?.length) && (
        <Section icon={TrendingUp} title="Market analysis">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Popularity" value={m.popularity} />
            <Field label="Customer rating" value={m.customer_rating} />
            <Field label="Market position" value={m.market_position} />
          </div>
          {m.best_use_cases && m.best_use_cases.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Best use cases</h4><BulletList items={m.best_use_cases} /></div>
          )}
        </Section>
      )}

      {/* Additional */}
      {(a.warranty || a.service_network || a.spare_parts_availability || a.awards_certifications?.length) && (
        <Section icon={ShieldCheck} title="Additional information">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Warranty" value={a.warranty} />
            <Field label="Service network" value={a.service_network} />
            <Field label="Spare parts availability" value={a.spare_parts_availability} />
          </div>
          {a.awards_certifications && a.awards_certifications.length > 0 && (
            <div><h4 className="font-medium mb-2 text-sm">Awards & certifications</h4><BadgeList items={a.awards_certifications} /></div>
          )}
        </Section>
      )}

      {/* Sources & notes */}
      {((r.sources && r.sources.length > 0) || r.confidence_notes) && (
        <Section icon={Quote} title="Sources & confidence notes">
          {r.confidence_notes && (
            <p className="text-sm text-muted-foreground leading-relaxed">{r.confidence_notes}</p>
          )}
          {r.sources && r.sources.length > 0 && (
            <ul className="text-sm space-y-1">
              {r.sources.map((s, i) => (
                <li key={i} className="text-muted-foreground break-all">• {s}</li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}