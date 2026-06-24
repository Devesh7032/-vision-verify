import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadImageToStorage } from "@/components/image-input";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — VisionVerify AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, avatar_url: avatarUrl }).eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !userId) return;
    try {
      const url = await uploadImageToStorage(f, userId, "profile-images");
      if (url) {
        setAvatarUrl(url);
        await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
        toast.success("Avatar updated");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  if (loading) {
    return <AppShell><div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <Card className="backdrop-blur-xl border-border/50 max-w-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{(fullName || email).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent/10 text-sm">
                  <Upload className="size-4" /> Change avatar
                </div>
              </Label>
              <input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving} style={{ background: "var(--gradient-primary)" }}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />} Save changes
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}