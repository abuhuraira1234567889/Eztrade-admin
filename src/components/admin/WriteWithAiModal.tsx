"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cleanupTranscript, enhanceWithAi } from "@/services/ai-write";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Prefill the draft field when the modal opens (e.g. current reply text). */
  initialDraft?: string;
  /** When set, shows “Insert into reply” and calls this with the enhanced (or draft) text. */
  onInsert?: (text: string) => void;
};

export function WriteWithAiModal({
  open,
  onClose,
  initialDraft = "",
  onInsert,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [converting, setConverting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [livePreview, setLivePreview] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [copied, setCopied] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalChunksRef = useRef<string[]>([]);
  const interimRef = useRef("");
  const intentionalStopRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const onCloseRef = useRef(onClose);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        // Keep onend so an intentional stop can still finalize speech → draft.
        rec.onerror = null;
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null;
    }
    clearTimer();
    setRecording(false);
    setElapsed(0);
  }, [clearTimer]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Seed draft / reset only on false → true open. Parent re-renders (ticket
  // polling) must not wipe speech conversion mid-session.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(initialDraft.trim());
      setResult("");
      setCopied(false);
      setConverting(false);
      setLivePreview("");
      finalChunksRef.current = [];
      interimRef.current = "";
      setSpeechSupported(!!getSpeechRecognitionCtor());
    }
    if (!open && wasOpenRef.current) {
      intentionalStopRef.current = true;
      stopRecognition();
      setLivePreview("");
      finalChunksRef.current = [];
      interimRef.current = "";
      setConverting(false);
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed on open edge only
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  function rebuildPreview() {
    const finals = finalChunksRef.current.join(" ").replace(/\s+/g, " ").trim();
    const interim = interimRef.current.trim();
    setLivePreview([finals, interim].filter(Boolean).join(" "));
  }

  async function finalizeToDraft() {
    // Prefer finals; if the browser never marked a chunk final, keep interim.
    const finals = finalChunksRef.current.join(" ").replace(/\s+/g, " ").trim();
    const interim = interimRef.current.trim();
    const raw = finals || interim;
    finalChunksRef.current = [];
    interimRef.current = "";
    setLivePreview("");

    if (!raw) {
      toast.error("No speech detected. Try again and speak clearly.");
      return;
    }

    setConverting(true);
    try {
      const cleaned = await cleanupTranscript(raw);
      const spoken = (cleaned.ok ? cleaned.text : raw).trim() || raw;
      if (!cleaned.ok) {
        toast.message("Could not polish with AI - using raw transcript.");
      }

      const prev = draftRef.current.trimEnd();
      const next = prev ? `${prev} ${spoken}` : spoken;
      draftRef.current = next;
      setDraft(next);
      toast.success("Voice converted to text.");
    } finally {
      setConverting(false);
    }
  }

  function startRecording() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechSupported(false);
      toast.error("Voice input needs Chrome, Edge, or Safari.");
      return;
    }

    intentionalStopRef.current = false;
    finalChunksRef.current = [];
    interimRef.current = "";
    setLivePreview("");

    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = (event.results[i][0]?.transcript ?? "").trim();
        if (!piece) continue;
        if (event.results[i].isFinal) {
          finalChunksRef.current.push(piece);
        } else {
          interim += (interim ? " " : "") + piece;
        }
      }
      interimRef.current = interim;
      rebuildPreview();
    };

    rec.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;
      if (event.error === "not-allowed") {
        toast.error("Microphone permission denied.");
        intentionalStopRef.current = true;
        stopRecognition();
        return;
      }
      toast.error(`Voice input error: ${event.error}`);
    };

    rec.onend = () => {
      // Browser may auto-end a long session - restart while still recording.
      if (!intentionalStopRef.current && recognitionRef.current === rec) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      if (recognitionRef.current === rec) {
        recognitionRef.current = null;
      }
      if (intentionalStopRef.current) {
        clearTimer();
        setRecording(false);
        setElapsed(0);
        void finalizeToDraft();
      }
    };

    try {
      recognitionRef.current = rec;
      rec.start();
      setRecording(true);
      setElapsed(0);
      clearTimer();
      timerRef.current = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    } catch {
      toast.error("Could not start voice input.");
      stopRecognition();
    }
  }

  function stopRecording() {
    if (!recording) return;
    intentionalStopRef.current = true;
    clearTimer();
    const rec = recognitionRef.current;
    if (!rec) {
      setRecording(false);
      void finalizeToDraft();
      return;
    }
    try {
      rec.stop();
    } catch {
      setRecording(false);
      void finalizeToDraft();
    }
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else startRecording();
  }

  async function onEnhance() {
    if (!draft.trim()) {
      toast.error("Record or type a draft first.");
      return;
    }
    if (recording) stopRecording();
    setEnhancing(true);
    setResult("");
    const res = await enhanceWithAi({
      draft: draft.trim(),
      contentType: "support",
    });
    if (res.ok) {
      setResult(res.text);
      toast.success("Enhanced copy ready.");
    } else {
      toast.error(res.error);
    }
    setEnhancing(false);
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy.");
    }
  }

  function resetAll() {
    intentionalStopRef.current = true;
    stopRecognition();
    setDraft("");
    setResult("");
    setLivePreview("");
    setCopied(false);
    finalChunksRef.current = [];
    interimRef.current = "";
  }

  function insertIntoReply() {
    const text = (result.trim() || draft.trim());
    if (!text || !onInsert) return;
    onInsert(text);
    onClose();
  }

  if (!open || !mounted) return null;

  const busy = enhancing || converting;
  const draftDisplay =
    recording || converting
      ? [draft.trim(), livePreview].filter(Boolean).join(draft.trim() ? " " : "")
      : draft;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-with-ai-title"
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl flex flex-col max-h-[min(880px,calc(100dvh-2rem))] sm:max-h-[min(880px,calc(100dvh-3rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h2
              id="write-with-ai-title"
              className="font-display font-bold text-lg flex items-center gap-2 text-foreground"
            >
              <Sparkles className="w-5 h-5 text-purple flex-shrink-0" />
              Write with AI
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Record or type a draft, then enhance it using the support knowledge document.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mt-0.5 -me-1 hover:bg-surface-soft rounded-md transition flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="field-label !mb-0" htmlFor="ai-write-draft">
                Draft
              </label>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={(!speechSupported && !recording) || converting}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-display font-semibold border transition",
                  recording
                    ? "border-red/40 bg-red-dim text-red"
                    : "border-border bg-surface-soft text-foreground hover:border-purple/40",
                )}
              >
                {recording ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red" />
                    </span>
                    <MicOff className="w-3.5 h-3.5" />
                    Stop · {formatElapsed(elapsed)}
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-purple" />
                    Record voice
                  </>
                )}
              </button>
            </div>
            <textarea
              id="ai-write-draft"
              value={recording || converting ? draftDisplay : draft}
              onChange={(e) => {
                if (recording || converting) return;
                setDraft(e.target.value);
              }}
              readOnly={recording || converting}
              rows={5}
              placeholder={
                recording
                  ? "Listening… speak now - text appears as you talk"
                  : converting
                    ? "Converting speech to text with Claude…"
                    : "Type here, or record voice and we’ll convert it to text…"
              }
              className={cn(
                "w-full rounded-lg border bg-surface-soft px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-y min-h-[110px] focus:outline-none focus:border-purple/50",
                recording || converting ? "border-red/40" : "border-border",
              )}
            />
            {!speechSupported && (
              <p className="text-xs text-amber mt-1.5">
                Voice input needs Chrome, Edge, or Safari. Type your draft instead.
              </p>
            )}
            {recording && (
              <p className="text-xs text-red mt-1.5">
                Recording {formatElapsed(elapsed)} - click Stop when finished.
              </p>
            )}
            {converting && (
              <p className="text-xs text-purple mt-1.5 inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Converting speech to text with Claude…
              </p>
            )}
          </div>

          {result && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="field-label !mb-0" htmlFor="ai-write-result">
                  Enhanced copy
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void copyResult()}
                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-display font-semibold border border-border hover:bg-surface-soft transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-green" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <textarea
                id="ai-write-result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={7}
                className="w-full rounded-lg border border-purple/30 bg-purple-dim/20 px-3 py-2.5 text-sm text-foreground resize-y min-h-[130px] focus:outline-none focus:border-purple/50"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3.5 border-t border-border flex-shrink-0">
          <button
            type="button"
            onClick={() => void onEnhance()}
            disabled={busy || !draft.trim()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-display font-semibold bg-purple text-white hover:bg-purple-light disabled:opacity-50 transition"
          >
            {enhancing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enhancing…
              </>
            ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Enhance with AI
                </>
              )}
            </button>
          <button
            type="button"
            onClick={resetAll}
            disabled={busy}
            className="inline-flex items-center h-9 px-3 rounded-md text-xs font-display font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-surface-soft transition disabled:opacity-50"
          >
            Clear
          </button>
          {onInsert && (
            <button
              type="button"
              onClick={insertIntoReply}
              disabled={busy || !(result.trim() || draft.trim())}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-display font-semibold border border-purple/30 bg-purple-dim text-purple hover:bg-purple/10 disabled:opacity-50 transition"
            >
              Insert into reply
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ms-auto inline-flex items-center h-9 px-3 rounded-md text-xs font-display font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-soft transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
