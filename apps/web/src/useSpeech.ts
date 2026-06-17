import { useCallback, useEffect, useRef, useState } from "react";

// useSpeech (Brief v5 item 2) — thin wrapper over the Web Speech API. Feature-detected and
// SSR/jsdom-safe (no SpeechRecognition → supported:false, all calls no-op). Auto-restarts on the
// ~60s silent Chrome stop and swallows the benign `no-speech` error (research pass). The cooking
// runtime stays LLM-free; this is a UI-edge device capability only (Doc 1 P2/P4).

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SpeechRecognitionLike;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeech {
  supported: boolean;
  listening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
}

export function useSpeech(onCommand?: (transcript: string) => void): UseSpeech {
  const ctorRef = useRef<SRCtor | null>(getCtor());
  const supported = !!ctorRef.current;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const onCmdRef = useRef(onCommand);
  onCmdRef.current = onCommand;

  const start = useCallback(() => {
    const ctor = ctorRef.current;
    if (!ctor || recRef.current) return;
    wantRef.current = true;
    const rec = new ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const results = e.results;
      const last = results[results.length - 1];
      const text = last?.[0]?.transcript?.trim() ?? "";
      if (text) {
        setTranscript(text);
        onCmdRef.current?.(text);
      }
    };
    rec.onerror = (e) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return; // benign — onend will restart
    };
    rec.onend = () => {
      recRef.current = null;
      if (wantRef.current) start(); // auto-restart while the user wants to listen
      else setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      /* start() throws if already started — ignore */
    }
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  useEffect(
    () => () => {
      wantRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return { supported, listening, transcript, start, stop };
}
