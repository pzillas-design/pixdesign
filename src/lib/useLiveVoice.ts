import { useCallback, useRef, useState } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { sendInquiry } from './gemini';
import { SYSTEM_PROMPT } from './systemPrompt';

export type LiveVoiceState = 'idle' | 'connecting' | 'listening' | 'speaking';

const toolDeclarations = [
  {
    name: 'send_email',
    description: 'Schickt eine Anfrage-Mail an Michael wenn der User konkret anfragen möchte und alle nötigen Infos gesammelt wurden.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fields_json: {
          type: Type.STRING,
          description: 'JSON-String mit allen gesammelten Feldern, z.B. {"Art":"Fotoshooting","Datum":"15. Juni","Ort":"Frankfurt"}',
        },
      },
      required: ['fields_json'],
    },
  },
  {
    name: 'end_session',
    description: 'Beendet den Voice-Dialog wenn der User das Gespräch abschließt (sagt Danke, Tschüss, auf Wiedersehen o.ä.). Vorher kurz verabschieden.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

export function useLiveVoice(onEmailSent?: () => void) {
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
    for (let i = 0; i < samples; i++) floats[i] = view.getInt16(i * 2, true) / 32768;

    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      if (audioQueueRef.current.length > 0) playNextChunk();
      else if (activeRef.current) setState('listening');
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const micCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxInRef.current = micCtx;
      playCtxRef.current = new AudioContext({ sampleRate: 24000 });

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
        callbacks: {
          onopen: () => {
            if (!activeRef.current) return;
            setState('listening');

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
              try {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' },
                });
              } catch {}
            };

            micSource.connect(processor);
            processor.connect(micCtx.destination);
          },

          onmessage: async (msg: any) => {
            if (!activeRef.current) return;

            // Handle tool calls (send_email)
            const toolCall = msg?.toolCall;
            if (toolCall?.functionCalls?.length) {
              for (const fn of toolCall.functionCalls) {
                if (fn.name === 'send_email') {
                  try {
                    const fields = JSON.parse(fn.args?.fields_json ?? '{}');
                    await sendInquiry(fields);
                    onEmailSent?.();
                  } catch {}
                  try {
                    sessionRef.current?.sendToolResponse({
                      functionResponses: [{ id: fn.id, name: fn.name, response: { output: 'sent' } }],
                    });
                  } catch {}
                }
                if (fn.name === 'end_session') {
                  try {
                    sessionRef.current?.sendToolResponse({
                      functionResponses: [{ id: fn.id, name: fn.name, response: { output: 'ok' } }],
                    });
                  } catch {}
                  // Short delay so the farewell audio can finish playing
                  setTimeout(() => stop(), 1800);
                }
              }
              return;
            }

            // Handle audio response
            const parts = msg?.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part?.inlineData?.data) {
                const binary = atob(part.inlineData.data as string);
                const buf = new ArrayBuffer(binary.length);
                const view = new Uint8Array(buf);
                for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
                audioQueueRef.current.push(buf);
                playNextChunk();
              }
            }
          },

          onerror: (e: any) => { console.error('Live voice error:', e); stop(); },
          onclose: () => { if (activeRef.current) stop(); },
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error('Live voice start error:', err);
      stop();
    }
  }, [state, stop, playNextChunk, onEmailSent]);

  return { state, start, stop };
}
