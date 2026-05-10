import { useCallback, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

export type LiveVoiceState = 'idle' | 'connecting' | 'listening' | 'speaking';

const SYSTEM_PROMPT = `Du bist der KI-Assistent von PIX — Kreativagentur von Michael Pzillas in Frankfurt.
Ton: direkt, knapp, ein bisschen Würze. Kein Smalltalk. Strikt max. 2 Sätze pro Antwort. Immer auf Deutsch.
Michael macht Webdesign (ab 500 €), Fotografie (Immobilien, Events, Business) und Video (Imagefilme, Events, Drohne).
Ziel: schnell verstehen was der Besucher braucht, dann einen Lead generieren.
Kontakt: 0159 06401995 · pzillas2@gmail.com`;

export function useLiveVoice() {
  const [state, setState] = useState<LiveVoiceState>('idle');
  const sessionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxInRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const activeRef = useRef(false);

  const playNextChunk = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !playCtxRef.current) return;
    isPlayingRef.current = true;
    setState('speaking');

    const chunk = audioQueueRef.current.shift()!;
    const ctx = playCtxRef.current;
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
      } else if (activeRef.current) {
        setState('listening');
      }
    };
    source.start();
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    audioCtxInRef.current?.close().catch(() => {});
    audioCtxInRef.current = null;
    playCtxRef.current?.close().catch(() => {});
    playCtxRef.current = null;
    try { sessionRef.current?.close?.(); } catch {}
    sessionRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    if (state !== 'idle') { stop(); return; }
    setState('connecting');
    activeRef.current = true;

    try {
      // Mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Input AudioContext 16kHz
      const micCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxInRef.current = micCtx;

      // Output AudioContext 24kHz
      playCtxRef.current = new AudioContext({ sampleRate: 24000 });

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_PROMPT,
        },
        callbacks: {
          onopen: () => {
            if (!activeRef.current) return;
            setState('listening');

            // Start streaming mic audio
            const micSource = micCtx.createMediaStreamSource(stream);
            const processor = micCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!sessionRef.current || !activeRef.current) return;
              const floats = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(floats.length);
              for (let i = 0; i < floats.length; i++) {
                int16[i] = Math.max(-1, Math.min(1, floats[i])) * 0x7fff;
              }
              const bytes = new Uint8Array(int16.buffer);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              const b64 = btoa(binary);
              try {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
                });
              } catch {}
            };

            micSource.connect(processor);
            processor.connect(micCtx.destination);
          },

          onmessage: (msg: any) => {
            if (!activeRef.current) return;
            const parts = msg?.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part?.inlineData?.data) {
                const b64 = part.inlineData.data as string;
                const binary = atob(b64);
                const buf = new ArrayBuffer(binary.length);
                const view = new Uint8Array(buf);
                for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
                audioQueueRef.current.push(buf);
                playNextChunk();
              }
            }
          },

          onerror: (e: any) => {
            console.error('Live voice error:', e);
            stop();
          },

          onclose: () => {
            if (activeRef.current) stop();
          },
        },
      });

      sessionRef.current = session;

    } catch (err) {
      console.error('Live voice start error:', err);
      stop();
    }
  }, [state, stop, playNextChunk]);

  return { state, start, stop };
}
