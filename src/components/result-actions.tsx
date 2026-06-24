import { Button } from "@/components/ui/button";
import { Copy, Share2, Printer } from "lucide-react";
import { toast } from "sonner";

export function ResultActions({ data, title }: { data: unknown; title: string }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Result copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function share() {
    const payload = { title, text };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(payload);
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copy();
  }

  function exportPdf() {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button size="sm" variant="outline" onClick={copy}><Copy className="size-4 mr-2" /> Copy</Button>
      <Button size="sm" variant="outline" onClick={share}><Share2 className="size-4 mr-2" /> Share</Button>
      <Button size="sm" variant="outline" onClick={exportPdf}><Printer className="size-4 mr-2" /> Export PDF</Button>
    </div>
  );
}