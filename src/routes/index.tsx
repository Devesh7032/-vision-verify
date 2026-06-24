import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Sparkles, ScanSearch, ShieldCheck, Zap, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VisionVerify AI — Product Recognition & AI Image Detection" },
      { name: "description", content: "Instantly identify any product or detect AI-generated images with VisionVerify AI. Powered by Google Gemini Vision." },
      { property: "og:title", content: "VisionVerify AI" },
      { property: "og:description", content: "AI-powered product recognition and AI image detection." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[600px] rounded-full blur-3xl opacity-30" style={{ background: "var(--gradient-primary)" }} />
        <div className="absolute bottom-0 right-0 size-[500px] rounded-full blur-3xl opacity-20" style={{ background: "var(--gradient-accent)" }} />
      </div>

      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Eye className="size-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">VisionVerify AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button style={{ background: "var(--gradient-primary)" }}>Get started</Button></Link>
        </div>
      </nav>

      <section className="container mx-auto px-6 py-20 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-6">
          <Sparkles className="size-3.5" />
          <span className="text-xs font-medium">Powered by Google Gemini Vision</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
          See beyond the image
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Instantly identify any product or detect AI-generated images with cutting-edge multimodal AI.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="text-base" style={{ background: "var(--gradient-primary)" }}>
              Start verifying free <ArrowRight className="size-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16 grid md:grid-cols-2 gap-6 max-w-5xl">
        {[
          { icon: ScanSearch, title: "Product Recognition", desc: "Snap a photo. Get brand, model, specs, year and price in seconds.", grad: "var(--gradient-primary)" },
          { icon: ShieldCheck, title: "AI Image Detection", desc: "Tell real from AI-generated. Confidence scored, with detected artifacts.", grad: "var(--gradient-accent)" },
        ].map(({ icon: Icon, title, desc, grad }) => (
          <Card key={title} className="border-border/50 backdrop-blur-xl hover:scale-[1.02] transition-transform">
            <CardContent className="p-8">
              <div className="size-12 rounded-xl flex items-center justify-center mb-4" style={{ background: grad }}>
                <Icon className="size-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="container mx-auto px-6 py-16 grid md:grid-cols-3 gap-6 max-w-5xl">
        {[
          { icon: Zap, title: "Lightning fast", desc: "Multimodal inference in seconds." },
          { icon: Lock, title: "Private & secure", desc: "Row-level security on every analysis." },
          { icon: Sparkles, title: "Always learning", desc: "Powered by Gemini's latest vision models." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="text-center">
            <Icon className="size-6 mx-auto mb-3 text-primary" />
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="container mx-auto px-6 py-10 border-t border-border/50 text-center text-sm text-muted-foreground">
        © 2026 VisionVerify AI. All rights reserved.
      </footer>
    </div>
  );
}
