import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, AlertTriangle, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractMenuFromPhoto, type ExtractedDish } from "@/lib/menu-photo.functions";
import { formatPrice } from "@/lib/dining";

async function toJpegDataUrl(file: File, max = 1600): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function MenuPhotoUpload({ placeId, placeName }: { placeId: string; placeName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const extract = useServerFn(extractMenuFromPhoto);
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<{ status: "idle" | "reading" | "done" | "error"; message?: string; dishes?: ExtractedDish[]; saved?: number }>({ status: "idle" });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const added = await Promise.all([...files].slice(0, 4 - photos.length).map((f) => toJpegDataUrl(f)));
      setPhotos((p) => [...p, ...added].slice(0, 4));
      setState({ status: "idle" });
    } catch {
      setState({ status: "error", message: "That file couldn't be opened. Please use a photo." });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function read() {
    if (photos.length === 0) return;
    setState({ status: "reading" });
    try {
      const r = await extract({ data: { placeId, images: photos } });
      if (!r.ok) { setState({ status: "error", message: r.error }); return; }
      setState({ status: "done", dishes: r.dishes, saved: r.saved });
      setPhotos([]);
      qc.invalidateQueries({ queryKey: ["safe"] });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong. Please try again." });
    }
  }

  return (
    <section aria-labelledby="menu-photo" className="flex flex-col gap-3">
      <h2 id="menu-photo" className="text-2xl font-bold">Add menu photos</h2>
      <p className="text-lg">Add up to 4 clear photos of {placeName}'s menu, one page at a time. AI will read the dishes so I can check them against your needs.</p>
      <input ref={input} id="menu-photo-input" type="file" multiple accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => onFiles(e.target.files)} />
      {photos.length > 0 && (
        <ul aria-label="Photos ready to read" className="grid grid-cols-2 gap-3">
          {photos.map((src, i) => (
            <li key={i} className="relative">
              <img src={src} alt={`Menu photo ${i + 1}`} className="aspect-[3/4] w-full rounded-xl border-2 border-foreground object-cover" />
              <Button variant="bigOutline" size="tap" className="mt-2 w-full" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                <X aria-hidden /> Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant={photos.length ? "bigOutline" : "big"} size="xl" className="justify-center" disabled={state.status === "reading" || photos.length >= 4} onClick={() => input.current?.click()}>
        <Camera aria-hidden /> {photos.length ? `Add another photo (${photos.length} of 4)` : "Take or choose a photo"}
      </Button>
      {photos.length > 1 && (
        <Button variant="bigOutline" size="tap" onClick={() => setPhotos((p) => p.slice(0, -1))}><Undo2 aria-hidden /> Undo last photo</Button>
      )}
      {photos.length > 0 && (
        <Button variant="big" size="xl" className="justify-center" disabled={state.status === "reading"} onClick={read}>
          {state.status === "reading" ? "Reading the menu…" : `Read ${photos.length === 1 ? "this photo" : `these ${photos.length} photos`}`}
        </Button>
      )}
      <div aria-live="polite" className="min-h-6">
        {state.status === "reading" && <p className="text-lg">This can take up to a minute. Please wait.</p>}
        {state.status === "error" && <p role="alert" className="text-lg font-bold text-destructive">{state.message}</p>}
        {state.status === "done" && (
          <div className="flex flex-col gap-3">
            <p className="text-lg font-bold">I read {state.dishes?.length} dishes and saved {state.saved} with prices.</p>
            <div className="flex gap-3 rounded-xl border-2 border-foreground bg-warning p-4 text-lg text-warning-foreground">
              <AlertTriangle aria-hidden className="size-8 shrink-0" />
              <p><strong>AI-inferred and unverified — not guaranteed safe.</strong> AI can misread menus and miss allergens. Always confirm allergens with the restaurant.</p>
            </div>
            <ul className="flex flex-col gap-2">
              {state.dishes?.map((d, i) => (
                <li key={i} className="rounded-xl border-2 border-foreground bg-card p-3 text-lg">
                  <span className="block font-bold">{d.name}{d.price !== null ? ` · ${formatPrice(d.price)}` : " · no price shown"}</span>
                  <span className="block">{d.summary}</span>
                  {d.diet_tags.length > 0 && <span className="block">Menu says: {d.diet_tags.join(", ")}</span>}
                  {d.possible_diet_tags.filter((t) => !d.diet_tags.includes(t)).length > 0 && (
                    <span className="block">Possibly: {d.possible_diet_tags.filter((t) => !d.diet_tags.includes(t)).join(", ")} <em>(AI guess, not used to filter)</em></span>
                  )}
                  {d.possible_allergens.length > 0 && <span className="block">May contain: {d.possible_allergens.map((a) => a.replace("_", " ")).join(", ")}</span>}
                  <span className="mt-1 inline-block rounded-md border-2 border-foreground px-2 text-base">AI-inferred · Unverified</span>
                </li>
              ))}
            </ul>
            <p className="text-lg">Dishes that fit your needs now appear in your list and best 3, marked AI-inferred.</p>
          </div>
        )}
      </div>
    </section>
  );
}
