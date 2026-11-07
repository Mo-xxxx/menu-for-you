import { useCallback, useEffect, useRef, useState } from "react";

type Rec = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Rec | null>(null);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setSupported(Boolean(w["SpeechRecognition"] || w["webkitSpeechRecognition"]));
    return () => { recRef.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);

  const listen = useCallback((onText: (t: string) => void) => {
    const w = window as unknown as Record<string, new () => Rec>;
    const Ctor = w["SpeechRecognition"] || w["webkitSpeechRecognition"];
    if (!Ctor) { setError("Voice is not available in this browser. Please use the buttons."); return; }
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.onresult = (e) => onText(e.results[0]?.[0]?.transcript ?? "");
    rec.onerror = (e) => setError(e.error === "no-speech" ? "I didn't hear anything. Please try again." : "Voice stopped. Please try again or use the buttons.");
    rec.onend = () => setListening(false);
    setError(null);
    setListening(true);
    recRef.current = rec;
    rec.start();
  }, []);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, []);

  return { listening, supported, error, listen, stop, speak };
}
