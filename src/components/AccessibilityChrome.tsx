import { useEffect } from "react";
import { useAccessibility } from "@/lib/accessibility";
import { useSpeech } from "@/lib/use-speech";
import { useTranscript, clearTranscript } from "@/lib/speech-bus";
import { Button } from "@/components/ui/button";

/**
 * Speaks each screen's heading when it opens, while "Read screens aloud" is on.
 * Mounted once, so every screen gets it without touching the screens.
 */
export function useAutoRead() {
  const a = useAccessibility();
  const { speak } = useSpeech();
  useEffect(() => {
    if (!a.autoRead) return;
    const id = setTimeout(() => {
      const heading = document.querySelector("main h1")?.textContent?.trim() ?? "";
      const extra = document.querySelector("[data-autoread]")?.textContent?.trim() ?? "";
      const text = [heading, extra].filter(Boolean).join(". ");
      if (text) speak(text);
    }, 450);
    return () => clearTimeout(id);
  }, [a.autoRead, speak]);
}

/**
 * Shows everything the app says out loud as text, for people who cannot hear
 * the speech. Mounted once at the bottom of the signed-in screens.
 */
export function CaptionsPanel() {
  const a = useAccessibility();
  const lines = useTranscript();
  if (!a.captions) return null;
  return (
    <section
      aria-label="Captions"
      aria-live="polite"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 border-t-4 border-foreground bg-card/95 px-4 py-3 backdrop-blur"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold uppercase tracking-wide">Captions</h2>
          <Button variant="bigOutline" size="tap" className="min-h-10 px-3 text-base" onClick={clearTranscript}>
            Clear
          </Button>
        </div>
        {lines.length === 0 ? (
          <p className="text-lg">Nothing said yet. What the app reads out loud appears here.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {lines.map((l) => (
              <li key={l.id} className="text-lg leading-snug">
                {l.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
