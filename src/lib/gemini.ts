import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from './supabase';
import { SYSTEM_PROMPT as HARDCODED_SYSTEM_PROMPT } from './systemPrompt';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

export type GalleryCategory = 'web' | 'photo' | 'video';

// ── Runtime context injected by the UI ──────────────────────────────────────
export type RuntimeContext = {
  activeBranch?: string;   // z.B. "Foto > Business"
};

let runtimeContext: RuntimeContext = {};

export function setRuntimeContext(ctx: RuntimeContext) {
  runtimeContext = ctx;
}

function buildRuntimeBlock(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const lang = navigator.language ?? 'de';
  const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';

  const lines = [
    `Datum: ${dateStr}, ${timeStr} Uhr`,
    `Gerät: ${device}, Sprache: ${lang}`,
  ];
  if (runtimeContext.activeBranch) {
    lines.push(`Aktiver Chat-Zweig: ${runtimeContext.activeBranch}`);
  }
  return `\n\n# Aktueller Kontext\n${lines.join('\n')}`;
}

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
  systemInstruction = ''; // force rebuild with fresh context on next message
}


async function buildSystemInstruction(): Promise<string> {
  const basePrompt = HARDCODED_SYSTEM_PROMPT;

  // Append project knowledge from Mediathek
  const { data: media } = await supabase
    .from('pix_media')
    .select('filename, alt, category, description')
    .neq('description', '')
    .order('created_at', { ascending: false });

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

  const toolInstructions = `

TOOLS (immer verfügbar):
1. show_gallery(category) — zeige Referenzbilder wenn der User Arbeiten sehen will. category = "web", "photo" oder "video".
2. send_email(fields_json) — wenn alle Infos da sind: Thema, Datum/Zeitraum, kurze Beschreibung (Name + Kontakt optional). Dann Mail senden.`;

  const projectSection = projectsText
    ? `\n\nPROJEKTE IN DER MEDIATHEK:\n${projectsText}`
    : '';

  return basePrompt + projectSection + toolInstructions + buildRuntimeBlock();
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
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (!token || !chatId) return false;

    const lines = ['📋 *Neue Anfrage via PIX Website*', ''];
    for (const [key, val] of Object.entries(fields)) {
      if (val) lines.push(`*${key}:* ${val}`);
    }
    lines.push('', `🕐 ${new Date().toLocaleString('de-DE')}`);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'Markdown',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
