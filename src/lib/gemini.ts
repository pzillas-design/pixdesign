import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

export type Chip = {
  label: string;
  reply?: string;
  href?: string;
  submit?: Record<string, string>;
};

export type AIResponse = {
  text: string;
  chips?: Chip[];
};

const toolDeclarations = [
  {
    name: 'show_chips',
    description:
      'Zeigt klickbare Chips unter deiner Antwort. Nutze reply-Chips um das Gespräch zu lenken. Nutze href-Chips für direkte Links (tel:, mailto:). Nutze einen submit-Chip wenn du alle nötigen Infos für eine Anfrage gesammelt hast.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chips: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              reply: { type: Type.STRING },
              href: { type: Type.STRING },
              submit_json: { type: Type.STRING, description: 'JSON-String mit gesammelten Feldern z.B. {"Art":"Fotoshooting","Datum":"15. Juni"}' },
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
let currentSystemInstruction = '';

export function resetSession() {
  chatSession = null;
}

export function initSession(systemInstruction: string) {
  currentSystemInstruction = systemInstruction;
  chatSession = null; // force recreate with new instruction
}

function getOrCreateSession() {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-3.1-flash-lite',
      config: {
        systemInstruction: currentSystemInstruction || getDefaultKnowledgeBase(),
        temperature: 0.7,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });
  }
  return chatSession;
}

export async function sendMessage(message: string): Promise<AIResponse> {
  try {
    const session = getOrCreateSession();
    const response = await session.sendMessage({ message });

    const fnCall = response.functionCalls?.()?.[0];
    if (fnCall && fnCall.name === 'show_chips') {
      const args = fnCall.args as { chips: Array<{ label: string; reply?: string; href?: string; submit_json?: string }> };
      // Map submit_json → submit object
      const chips: Chip[] = args.chips.map((c) => ({
        label: c.label,
        reply: c.reply,
        href: c.href,
        submit: c.submit_json ? JSON.parse(c.submit_json) : undefined,
      }));
      await session.sendMessage({
        message: '',
        // @ts-ignore
        functionResponses: [{ name: 'show_chips', response: { output: 'shown' } }],
      });
      return { text: response.text ?? '', chips };
    }

    return { text: response.text ?? 'Entschuldigung, ich habe das nicht verstanden.' };
  } catch (error) {
    console.error('Gemini error:', error);
    return { text: 'Es gab einen Verbindungsfehler. Bitte nochmal versuchen.' };
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    // Use REST API directly for TTS as SDK support varies
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-live-001:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
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

function getDefaultKnowledgeBase(): string {
  return `PERSONA:
Du bist der persönliche KI-Assistent von PIX, einer Kreativagentur in Frankfurt.
Du bist die Stimme der Agentur — ruhig, direkt, auf Augenhöhe. Kein Marketing-Speak. Chat-typisch kurz.
Antworte immer auf Deutsch.

DIENSTLEISTUNGEN:
1. Webdesign & Apps: Websites, Web-Apps, Tools, Landing Pages. Ab 3.000 EUR.
2. Fotografie: Business-Portraits, Events, Immobilien, Architektur. Ab 800 EUR (Halbtag).
3. Videoproduktion: Imagefilme, Eventfilme, Immobilienvideos, Drohne. Ab 1.500 EUR.

WAS WIR NICHT MACHEN: Kein Printdesign, keine Social-Media-Verwaltung.

KONTAKT: pzillas2@gmail.com — Erstkontakt ist unverbindlich.

CHIPS:
Du hast das Tool "show_chips". Nutze es um dem User Optionen anzubieten.
- reply-Chips: lenken das Gespräch (Webdesign / Fotografie / Video)
- href-Chips: z.B. { href: "mailto:pzillas2@gmail.com" }
- submit-Chips: wenn alle Infos für eine Anfrage da sind, liefere alle gesammelten Felder als submit_json

ANFRAGE-FLOW:
Wenn jemand konkret anfragen möchte: frage Typ → Datum/Zeitraum → Ort → kurze Beschreibung → optional Name + Kontakt-Mail.
Maximal 1 Frage pro Nachricht. Dann submit-Chip "Anfrage absenden ✉️".`;
}
