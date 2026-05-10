import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from './supabase';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

export type GalleryCategory = 'web' | 'photo' | 'video';

export type AIResponse = {
  text: string;
  gallery?: GalleryCategory;
  sendEmail?: Record<string, string>;
};

const toolDeclarations = [
  {
    name: 'show_gallery',
    description: 'Zeigt eine Bildgalerie mit Projekten aus dem Portfolio. Nutze dies wenn der User Arbeiten sehen möchte oder wenn ein Thema visuell unterstützt werden soll.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          enum: ['web', 'photo', 'video'],
          description: 'Kategorie der Projekte',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'send_email',
    description: 'Schickt eine Anfrage-Mail an Michael wenn der User konkret anfragen möchte und alle nötigen Infos gesammelt wurden.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fields_json: {
          type: Type.STRING,
          description: 'JSON-String mit allen gesammelten Feldern, z.B. {"Art":"Fotoshooting","Datum":"15. Juni","Ort":"Frankfurt","Beschreibung":"..."}',
        },
      },
      required: ['fields_json'],
    },
  },
];

let chatSession: ReturnType<typeof ai.chats.create> | null = null;
let systemInstruction = '';

export function resetSession() {
  chatSession = null;
}

async function buildSystemInstruction(): Promise<string> {
  // Load projects from Mediathek
  const { data: media } = await supabase
    .from('pix_media')
    .select('filename, alt, category, description')
    .neq('description', '')
    .order('created_at', { ascending: false });

  // Load knowledge base
  const { data: knowledge } = await supabase
    .from('pix_knowledge')
    .select('key, value');

  const kb = Object.fromEntries((knowledge ?? []).map((r: any) => [r.key, r.value]));

  const persona = kb.persona || 'Du bist der KI-Assistent von PIX, einer Kreativagentur in Frankfurt. Ruhig, direkt, auf Augenhöhe. Kein Marketing-Speak. Kurze Chat-Nachrichten. Immer auf Deutsch.';
  const servicesWeb = kb.services_web || 'Websites, Web-Apps, Tools, Landing Pages. Ab 3.000 EUR.';
  const servicesPhoto = kb.services_photo || 'Business-Portraits, Events, Immobilien, Architektur. Ab 800 EUR.';
  const servicesVideo = kb.services_video || 'Imagefilme, Eventfilme, Immobilienvideos, Drohne. Ab 1.500 EUR.';
  const notOffered = kb.not_offered || 'Kein Printdesign, keine Social-Media-Verwaltung.';
  const contact = kb.contact || 'E-Mail: pzillas2@gmail.com';
  const location = kb.location || 'Frankfurt am Main.';

  // Build project knowledge
  const projectsByCategory: Record<string, string[]> = { web: [], photo: [], video: [] };
  for (const item of media ?? []) {
    const cat = item.category as GalleryCategory;
    if (projectsByCategory[cat]) {
      projectsByCategory[cat].push(`- ${item.alt || item.filename}: ${item.description}`);
    }
  }

  const projectsText = Object.entries(projectsByCategory)
    .filter(([, items]) => items.length > 0)
    .map(([cat, items]) => `${cat.toUpperCase()}:\n${items.join('\n')}`)
    .join('\n\n');

  return `PERSONA: ${persona}

DIENSTLEISTUNGEN:
Web: ${servicesWeb}
Foto: ${servicesPhoto}
Video: ${servicesVideo}
Nicht angeboten: ${notOffered}

STANDORT: ${location}
KONTAKT: ${contact}

PROJEKTE UND REFERENZEN:
${projectsText || '(Noch keine Projekte in der Mediathek)'}

TOOLS:
Du hast zwei Tools:
1. show_gallery(category) — zeige Bilder wenn der User Arbeiten sehen will oder wenn es das Gespräch bereichert. category = "web", "photo" oder "video".
2. send_email(fields_json) — wenn der User konkret anfragen möchte: sammle Art, Datum, Ort, Beschreibung, optional Name und E-Mail, dann sende die Mail.

WICHTIG: Stelle maximal eine Frage pro Nachricht. Halte Antworten kurz.`;
}

async function getOrCreateSession() {
  if (!chatSession) {
    if (!systemInstruction) {
      systemInstruction = await buildSystemInstruction();
    }
    chatSession = ai.chats.create({
      model: 'gemini-3.1-flash-lite',
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });
  }
  return chatSession;
}

export async function sendMessage(message: string): Promise<AIResponse> {
  try {
    const session = await getOrCreateSession();
    const response = await session.sendMessage({ message });

    const calls = typeof response.functionCalls === 'function'
      ? response.functionCalls()
      : (response.functionCalls ?? []);
    const fnCall = calls?.[0];

    if (fnCall?.name === 'show_gallery') {
      const category = (fnCall.args as any).category as GalleryCategory;
      await session.sendMessage({
        message: '',
        // @ts-ignore
        functionResponses: [{ name: 'show_gallery', response: { output: 'shown' } }],
      });
      return { text: response.text ?? '', gallery: category };
    }

    if (fnCall?.name === 'send_email') {
      const fields = JSON.parse((fnCall.args as any).fields_json ?? '{}');
      await session.sendMessage({
        message: '',
        // @ts-ignore
        functionResponses: [{ name: 'send_email', response: { output: 'sent' } }],
      });
      return { text: response.text ?? '', sendEmail: fields };
    }

    return { text: response.text ?? 'Entschuldigung, ich habe das nicht verstanden.' };
  } catch (error: any) {
    console.error('Gemini error:', error?.message ?? error);
    return { text: 'Es gab einen Verbindungsfehler. Bitte nochmal versuchen.' };
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
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
  } catch {
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
