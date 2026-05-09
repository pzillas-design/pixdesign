import { GoogleGenAI, Type } from '@google/genai';
import { knowledgeBase } from '../config/knowledgeBase';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

export type Chip = {
  label: string;
  reply?: string;   // sends as user message and continues chat
  href?: string;    // opens link (tel:, mailto:, https://)
  submit?: Record<string, string>; // collected fields → send email
};

export type AIResponse = {
  text: string;
  chips?: Chip[];
};

const toolDeclarations = [
  {
    name: 'show_chips',
    description:
      'Zeigt klickbare Chips unter deiner Antwort. Nutze reply-Chips um das Gespräch zu lenken (z.B. Themen, Kategorien). Nutze href-Chips für direkte Links (tel:, mailto:). Nutze einen submit-Chip wenn du alle nötigen Infos gesammelt hast um eine Anfrage per Mail zu schicken.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chips: {
          type: Type.ARRAY,
          description: 'Liste von Chips',
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING, description: 'Beschriftung des Chips' },
              reply: { type: Type.STRING, description: 'Text der als User-Nachricht gesendet wird' },
              href: { type: Type.STRING, description: 'URL (tel:, mailto:, https://)' },
              submit: {
                type: Type.OBJECT,
                description: 'Gesammelte Anfragedaten als Key-Value-Paare die per Mail gesendet werden',
                properties: {},
                additionalProperties: { type: Type.STRING },
              },
            },
            required: ['label'],
          },
        },
      },
      required: ['chips'],
    },
  },
];

let chatSession: ReturnType<typeof ai.chats.create> | null = null;

function getOrCreateSession() {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-2.0-flash-lite',
      config: {
        systemInstruction: knowledgeBase,
        temperature: 0.7,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });
  }
  return chatSession;
}

export function resetSession() {
  chatSession = null;
}

export async function sendMessage(message: string): Promise<AIResponse> {
  try {
    const session = getOrCreateSession();
    const response = await session.sendMessage({ message });

    const fnCall = response.functionCalls?.()?.[0];
    if (fnCall && fnCall.name === 'show_chips') {
      const args = fnCall.args as { chips: Chip[] };
      // Keep session in sync
      await session.sendMessage({
        message: '',
        // @ts-ignore
        functionResponses: [{ name: 'show_chips', response: { output: 'shown' } }],
      });
      return { text: response.text ?? '', chips: args.chips };
    }

    return { text: response.text ?? 'Entschuldigung, ich habe das nicht verstanden.' };
  } catch (error) {
    console.error('Gemini error:', error);
    return { text: 'Es gab einen Verbindungsfehler. Bitte nochmal versuchen.' };
  }
}

// Text-to-Speech via Gemini
import { Modality } from '@google/genai';

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
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

export async function sendInquiry(fields: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-inquiry`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ fields }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
