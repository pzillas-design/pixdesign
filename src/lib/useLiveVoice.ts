import { useCallback, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

export type LiveVoiceState = 'idle' | 'connecting' | 'listening' | 'speaking';

const SYSTEM_PROMPT = `Du bist der KI-Assistent von PIX — Kreativagentur von Michael Pzillas in Frankfurt.
Ton: direkt, knapp, ein bisschen Würze. Kein Smalltalk. Strikt max. 2 Sätze pro Antwort. Immer auf Deutsch.
Michael macht Webdesign (ab 500 €), Fotografie (Immobilien, Events, Business) und Video (Imagefilme, Events, Drohne).
Ziel: schnell verstehen was der Besucher braucht, dann einen Lead generieren.
Kontakt: 0159 06401995 · pzillas2@gmail.com`;

export function useLiveVoice(onTranscript?: (role: 'user' | 'ai', text: string) => void) {
  const [state, setState] = useState<LiveVoiceState>('idle');
  const sessionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setState('speaking');

    const chunk = audioQueueRef.current.shift()!;
    const ctx = playCtxRef.current!;

    // PCM 24kHz 16-bit little-endian → float
    const view = new DataView(chunk);
    const samples = chunk.byteLength / 2;
    const floats = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      floats[i] = view.getInt16(i * 2, true) / 32768;
    }

    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      if (audioQueueRef.current.length > 0) {
        playNextChunk();
      } else if (sessionRef.current) {
        setState('listening');
      }
    };
    source.start();
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    playCtxRef.current?.close();
    playCtxRef.current = null;
    sessionRef.current?.close?.();
    sessionRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    if (state !== 'idle') { stop(); return; }
    setState('connecting');

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      // Get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Mic AudioContext at 16kHz for sending
      const micCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = micCtx;
      const micSource = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Play AudioContext at 24kHz for receiving
      playCtxRef.current = new AudioContext({ sampleRate: 24000 });

      // Connect Gemini Live session
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_PROMPT,
        },
        callbacks: {
          onopen: () => setState('listening'),
          onmessage: (msg: any) => {
            const parts = msg?.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                const binary = atob(part.inlineData.data);
                const buf = new ArrayBuffer(binary.length);
                const view = new Uint8Array(buf);
                for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
                audioQueueRef.current.push(buf);
                playNextChunk();
              }
              if (part.text) {
                onTranscript?.('ai', part.text);
              }
            }
          },
          onerror: (e: any) => { console.error('Live error', e); stop(); },
          onclose: () => { if (sessionRef.current) stop(); },
        },
      });
      sessionRef.current = session;

      // Stream mic PCM to Gemini
      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const floats = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(floats.length);
        for (let i = 0; i < floats.length; i++) {
          int16[i] = Math.max(-1, Math.min(1, floats[i])) * 0x7fff;
        }
        const b64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
        session.sendRealtimeInput({
          audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
        });
      };

      micSource.connect(processor);
      processor.connect(micCtx.destination);

    } catch (err) {
      console.error('Live voice error:', err);
      stop();
    }
  }, [state, stop, playNextChunk, onTranscript]);

  return { state, start, stop };
}
