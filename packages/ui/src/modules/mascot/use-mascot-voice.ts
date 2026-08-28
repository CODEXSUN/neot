"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionResultEvent = Event & {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type SpeechRecognitionInstance = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  start(): void;
  stop(): void;
};

type RecognitionConstructor = new () => SpeechRecognitionInstance;

export function useMascotVoice(onTranscript?: (transcript: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const failedRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const supported = typeof window !== "undefined" && Boolean(recognitionConstructor());

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setMessage("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcript = transcriptFrom(event);
      finalTranscriptRef.current = transcript.final || transcript.visible || finalTranscriptRef.current;
      setMessage(transcript.visible);
    };
    recognition.onerror = () => {
      failedRef.current = true;
      setMessage("I couldn't hear that. Please try again.");
      setListening(false);
    };
    recognition.onend = () => {
      const transcript = finalTranscriptRef.current.trim();
      recognitionRef.current = null;
      setListening(false);
      if (!failedRef.current && transcript) onTranscriptRef.current?.(transcript);
    };
    recognitionRef.current = recognition;
    finalTranscriptRef.current = "";
    failedRef.current = false;
    setMessage("");
    setListening(true);
    recognition.start();
  }

  function clear() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setMessage("");
  }

  return { clear, listening, message, supported, toggle };
}

function recognitionConstructor(): RecognitionConstructor | undefined {
  const voiceWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
}

function transcriptFrom(event: RecognitionResultEvent) {
  const finalPhrases: string[] = [];
  const visiblePhrases: string[] = [];
  for (let index = 0; index < event.results.length; index += 1) {
    const phrase = event.results[index]?.[0]?.transcript.trim();
    if (!phrase) continue;
    visiblePhrases.push(phrase);
    if (event.results[index]?.isFinal) finalPhrases.push(phrase);
  }
  return { final: finalPhrases.join(" "), visible: visiblePhrases.join(" ") };
}
