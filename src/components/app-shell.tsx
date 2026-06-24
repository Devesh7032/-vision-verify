import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Eye, LayoutDashboard, ScanSearch, ShieldCheck, User, LogOut, GitCompareArrows, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/product-recognition", label: "Product Recognition", icon: ScanSearch },
  { to: "/product-comparison", label: "Product Comparison", icon: GitCompareArrows },
  { to: "/fake-detector", label: "Fake Detector", icon: ShieldAlert },
  { to: "/ai-detection", label: "AI Detection", icon: ShieldCheck },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl p-4">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Eye className="size-5 text-primary-foreground" />
          </div>
          <span className="font-bold">VisionVerify</span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="size-4 mr-2" /> Sign out
        </Button>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to} className={`flex flex-col items-center gap-1 py-3 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="size-5" />
                {label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">{children}</main>
    </div>
  );
}