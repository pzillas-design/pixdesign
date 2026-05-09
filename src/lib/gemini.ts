import { GoogleGenAI, Modality } from '@google/genai';
import { knowledgeBase } from '../config/knowledgeBase';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

let chatSession: ReturnType<typeof ai.chats.create> | null = null;

function getOrCreateSession() {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: knowledgeBase,
        temperature: 0.7,
      },
    });
  }
  return chatSession;
}

export function resetSession() {
  chatSession = null;
}

export async function sendMessage(message: string): Promise<string> {
  try {
    const session = getOrCreateSession();
    const response = await session.sendMessage({ message });
    return response.text ?? 'Entschuldigung, ich habe das nicht verstanden.';
  } catch (error) {
    console.error('Gemini error:', error);
    return 'Es gab einen Verbindungsfehler. Bitte nochmal versuchen.';
  }
}

export async function getGreeting(): Promise<string> {
  try {
    const session = getOrCreateSession();
    const response = await session.sendMessage({
      message: 'Begrüße den Besucher kurz und einladend. Max 2 Sätze.',
    });
    return response.text ?? 'Hallo, willkommen bei PIX.';
  } catch {
    return 'Hallo, willkommen bei PIX.';
  }
}

// Text-to-Speech via Gemini
export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
  } catch (error) {
    console.error('TTS error:', error);
    return null;
  }
}
