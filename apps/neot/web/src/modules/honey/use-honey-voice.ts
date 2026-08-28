import { useEffect, useRef, useState } from "react";

type RecognitionEvent = Event & { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> };
type RecognitionError = Event & { error?: string };
type Recognition = EventTarget & { continuous: boolean; interimResults: boolean; lang: string; onend: (() => void) | null; onerror: ((event: RecognitionError) => void) | null; onresult: ((event: RecognitionEvent) => void) | null; start(): void; stop(): void };
type RecognitionConstructor = new () => Recognition;

export function useHoneyVoice(onTranscript: (value: string) => void, onComplete: (value: string) => void) {
  const recognitionRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [silenceTimeout, setSilenceTimeoutState] = useState(() => Number(window.localStorage.getItem("neot.honey.voice-silence-ms")) || 1800);
  const supported = Boolean(getRecognition());

  useEffect(() => () => cancel(), []);

  function start() {
    const RecognitionApi = getRecognition();
    if (!RecognitionApi) return setError("Voice recognition is unavailable. Type your message or use Chrome or Edge.");
    const recognition = new RecognitionApi();
    transcriptRef.current = ""; cancelledRef.current = false;
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcript = readTranscript(event);
      transcriptRef.current = transcript; setPreview(transcript); onTranscript(transcript); resetSilenceTimer();
    };
    recognition.onerror = (event) => {
      const permission = event.error === "not-allowed" || event.error === "service-not-allowed";
      setError(permission ? "Microphone access is blocked. Allow it in the browser site settings, then retry." : "Honey could not hear you. Check the microphone and retry.");
      setListening(false);
    };
    recognition.onend = finish;
    recognitionRef.current = recognition; setError(""); setPreview(""); setListening(true); recognition.start();
  }

  function finish() {
    clearSilenceTimer(); recognitionRef.current = null; setListening(false);
    const transcript = transcriptRef.current.trim();
    if (!cancelledRef.current && transcript) onComplete(transcript);
  }

  function cancel() {
    cancelledRef.current = true; clearSilenceTimer(); recognitionRef.current?.stop(); recognitionRef.current = null; setListening(false); setPreview("");
  }

  function retry() { cancel(); window.setTimeout(start, 50); }
  function toggle() { if (listening) recognitionRef.current?.stop(); else start(); }
  function setSilenceTimeout(value: number) { setSilenceTimeoutState(value); window.localStorage.setItem("neot.honey.voice-silence-ms", String(value)); }
  function resetSilenceTimer() { clearSilenceTimer(); silenceTimerRef.current = window.setTimeout(() => recognitionRef.current?.stop(), silenceTimeout); }
  function clearSilenceTimer() { if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }

  return { cancel, error, listening, preview, retry, setSilenceTimeout, silenceTimeout, supported, toggle };
}

function getRecognition(): RecognitionConstructor | undefined {
  const voiceWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
}

function readTranscript(event: RecognitionEvent) {
  const phrases: string[] = [];
  for (let index = 0; index < event.results.length; index += 1) {
    const phrase = event.results[index]?.[0]?.transcript.trim(); if (phrase) phrases.push(phrase);
  }
  return phrases.join(" ");
}
