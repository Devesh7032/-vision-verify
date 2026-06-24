import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ImagePicked {
  file: File;
  dataUrl: string;
}

export function ImageInput({ value, onChange }: { value: ImagePicked | null; onChange: (v: ImagePicked | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);

  function handleFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => onChange({ file: f, dataUrl: String(reader.result) });
    reader.readAsDataURL(f);
  }

  function isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function handleCaptureClick() {
    console.log("[ImageInput] Capture Photo handler triggered");
    if (isMobileDevice()) {
      console.log("[ImageInput] Mobile detected — opening native camera input");
      cameraRef.current?.click();
    } else {
      console.log("[ImageInput] Desktop detected — opening webcam modal");
      setWebcamOpen(true);
    }
  }

  function handleUploadClick() {
    console.log("[ImageInput] Upload Image handler triggered");
    fileRef.current?.click();
  }

  if (value) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border/50">
        <img src={value.dataUrl} alt="Selected" className="w-full max-h-96 object-contain bg-black/40" />
        <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={() => onChange(null)}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith("image/")) handleFile(f);
      }}
      className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${drag ? "border-primary bg-primary/5" : "border-border/50"}`}
    >
      <p className="text-sm text-muted-foreground mb-4">Drag and drop an image, or choose:</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={handleCaptureClick} variant="outline">
          <Camera className="size-4 mr-2" /> Capture photo
        </Button>
        <Button type="button" onClick={handleUploadClick} style={{ background: "var(--gradient-primary)" }}>
          <Upload className="size-4 mr-2" /> Upload from gallery
        </Button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
    <WebcamCaptureDialog
      open={webcamOpen}
      onClose={() => setWebcamOpen(false)}
      onCapture={(file, dataUrl) => { onChange({ file, dataUrl }); setWebcamOpen(false); }}
    />
    </>
  );
}

function WebcamCaptureDialog({ open, onClose, onCapture }: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File, dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Webcam API not available in this browser");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error("[ImageInput] getUserMedia failed", e);
        const msg = e instanceof Error ? e.message : "Camera access denied";
        setError(/NotAllowed|Permission/i.test(msg) ? "Camera permission denied. Allow camera access and try again." : msg);
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onCapture(file, dataUrl);
    }, "image/jpeg", 0.92);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 mr-2 animate-spin" /> Starting camera…
              </div>
            )}
            <video ref={videoRef} className="w-full h-full object-contain" playsInline muted autoPlay />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={capture} disabled={!!error || starting} style={{ background: "var(--gradient-primary)" }}>
              <Camera className="size-4 mr-2" /> Capture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export async function uploadImageToStorage(file: File, userId: string, bucket: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  if (bucket === "analysis-images") {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
    return data?.signedUrl ?? null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function dataUrlToBase64(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}