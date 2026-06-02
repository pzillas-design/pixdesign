import { SYSTEM_PROMPT } from '../src/lib/systemPrompt.js';
import { mediaLibrary } from '../src/lib/mediaLibrary.js';
import { handleOptions, json, pickString, readBody } from './_shared.js';

function buildSystemInstruction(runtimeContext?: { activeBranch?: string }) {
  const projectsByCategory: Record<string, string[]> = { web: [], photo: [], video: [] };
  for (const item of mediaLibrary) {
    if (!item.title && !item.description) continue;
    const type = item.tags.find(t => ['web', 'photo', 'video'].includes(t));
    if (type && projectsByCategory[type]) {
      projectsByCategory[type].push(`- ${item.title || item.file}: ${item.description || ''}`);
    }
  }

  const projectsText = Object.entries(projectsByCategory)
    .filter(([, items]) => items.length > 0)
    .map(([cat, items]) => `${cat.toUpperCase()}:\n${items.join('\n')}`)
    .join('\n\n');

  const runtimeLines = [
    `Datum: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
  ];
  if (runtimeContext?.activeBranch) runtimeLines.push(`Aktiver Chat-Zweig: ${runtimeContext.activeBranch}`);

  return `${SYSTEM_PROMPT}

PROJEKTE IN DER MEDIATHEK:
${projectsText}

TOOLS ALS JSON:
- Wenn Arbeiten gezeigt werden sollen (show_images): showImages als Array mit Tags, z.B. ["photo","realestate"]. Nutze die Tags aus der PROJEKTE-Liste oder: architektur, brand, business, event, landing, menschen, photo, realestate, startscreen, tools, video, web.
- Wenn eine konkrete Anfrage komplett ist: sendEmail als Objekt mit gesammelten Feldern.
- gallery weglassen (deprecated).
- Sonst showImages und sendEmail weglassen.

Antworte ausschliesslich als JSON:
{"text":"Antwort an den Besucher","showImages":["tag1","tag2"] optional,"sendEmail":{"Art":"..."} optional}

# Aktueller Kontext
${runtimeLines.join('\n')}`;
}

function parseJsonResponse(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

function safeParseResponse(text: string) {
  try {
    return parseJsonResponse(text);
  } catch {
    return { text: text || 'Ich bin kurz unsicher. Kannst du das nochmal anders formulieren?' };
  }
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'Gemini nicht konfiguriert' });

  try {
    const body = await readBody(req);
    const history: { role: string; text: string }[] = Array.isArray(body.history) ? body.history : [];
    if (!history.length) return json(res, 400, { error: 'Leere Nachricht' });

    const contents = history.map((turn: { role: string; text: string }) => ({
      role: turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(turn.text).slice(0, 6000) }],
    }));

    const payload = {
      systemInstruction: { parts: [{ text: buildSystemInstruction(body.runtimeContext) }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    let upstream: Response;
    try {
      upstream = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await upstream.json();
    if (!upstream.ok) {
      return json(res, upstream.status, { error: data?.error?.message ?? 'Gemini Fehler' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = safeParseResponse(text);
    const validTags = ['architektur','brand','business','event','landing','menschen','photo','realestate','startscreen','tools','video','web'];
    const showImages = Array.isArray(parsed.showImages)
      ? parsed.showImages.filter((t: unknown) => typeof t === 'string' && validTags.includes(t))
      : undefined;
    return json(res, 200, {
      text: pickString(parsed.text, 'Ich bin kurz unsicher. Kannst du das nochmal anders formulieren?'),
      showImages: showImages && showImages.length > 0 ? showImages : undefined,
      sendEmail: parsed.sendEmail && typeof parsed.sendEmail === 'object' ? parsed.sendEmail : undefined,
    });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
