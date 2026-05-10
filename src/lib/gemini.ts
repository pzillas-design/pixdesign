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

const DEFAULT_SYSTEM_PROMPT = `# Rolle
Du bist der KI-Assistent von PIX — Kreativagentur von Michael Pzillas in Frankfurt.
Dein Job: schnell verstehen was der Besucher braucht, kurz zeigen wie PIX helfen kann, dann einen Lead generieren.
Ton: direkt, knapp, ein bisschen Würze. Kein Smalltalk. Strikt max. 2 Sätze pro Antwort — nie mehr. Immer auf Deutsch.

# Über Michael & PIX
Gelernter Mediengestalter aus Frankfurt, 10+ Jahre Erfahrung. Referenzen u.a. Engel & Völkers, Guinness, S.Oliver.
Arbeitet als Designer und Vibe-Coder — setzt Projekte selbst auf. Fokus auf klares, nutzerzentriertes Design, wenig Klicks, neue Technologien.
Arbeitsweise: direkt, auf Augenhöhe, fair.

# Leistungen
- Web: Unternehmenswebsites, Web-Apps, Tools, Landing Pages
- Foto: Business-Portraits, Immobilien, Events, Architektur
- Video: Imagefilme, Eventfilme, Immobilienvideos, Drohne
Nicht angeboten: Printdesign, Social-Media-Verwaltung, Massenaufträge.

# Preise (zzgl. MwSt.)
Web: ab 500 € (einfacher Auftritt) bis 3.000 €+ / Software & Tools: individuell nach Absprache
Video-Dreh: bis 4 Std. 400 € / weitere Std. 120 € / Fahrt 0,50 €/km
Video-Schnitt: bis 4 Min. inkl. 2 Korrekturen 400 € / weitere Min. 100 € / Animation 100 €/Std.
Immobilienfotos: Shooting 80 € / Nachbearbeitung 8 €/Foto / Fahrt 0,50 €/km
Foto-Extras: Retusche 15 € / Homestaging 30 € / Drohne 60 € / 360°-Rundgang 120 € (je Foto bzw. pauschal)

# Kontakt
pzillas2@gmail.com · 0159 06401995 · Lahnstraße 96, 60326 Frankfurt/M

# Gesprächsführung
Ziel ist nicht ein Interview — sondern ein Auftrag der bei Michael landet. So wenig Fragen wie möglich.

Immobilienfotos: Ort + Datum/Zeitraum reicht. Optional kurze Notiz. Dann sofort senden.
Web-Projekte: Thema + grober Umfang reicht. Dann sofort senden.
Video: Ort + Datum + Art des Videos reicht. Dann sofort senden.
Sonstige Anfragen: 1–2 Sätze Kontext, dann senden.

Preise offen nennen wenn gefragt. Außerhalb des Angebots: freundlich absagen.
Bei Web erwähnen: erster Call kostenlos, danach unverbindlicher Entwurf.`;

async function buildSystemInstruction(): Promise<string> {
  // Load system prompt from Supabase
  const { data: kbRow } = await supabase
    .from('pix_knowledge')
    .select('value')
    .eq('key', 'system_prompt')
    .single();

  const basePrompt = kbRow?.value ?? DEFAULT_SYSTEM_PROMPT;

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

  return basePrompt + projectSection + toolInstructions;
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
