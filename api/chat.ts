import { SYSTEM_PROMPT } from '../src/lib/systemPrompt';
import { mediaLibrary } from '../src/lib/mediaLibrary';
import { handleOptions, json, pickString, readBody } from './_shared';

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
- Wenn Arbeiten gezeigt werden sollen: gallery = "web", "photo" oder "video".
- Wenn eine konkrete Anfrage komplett ist: sendEmail als Objekt mit gesammelten Feldern.
- Sonst gallery und sendEmail weglassen.

Antworte ausschliesslich als JSON:
{"text":"Antwort an den Besucher","gallery":"web|photo|video optional","sendEmail":{"Art":"..."} optional}

# Aktueller Kontext
${runtimeLines.join('\n')}`;
}

function parseJsonResponse(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'Gemini nicht konfiguriert' });

  try {
    const body = await readBody(req);
    const message = pickString(body.message).slice(0, 6000);
    if (!message) return json(res, 400, { error: 'Leere Nachricht' });

    const payload = {
      systemInstruction: { parts: [{ text: buildSystemInstruction(body.runtimeContext) }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    };

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await upstream.json();
    if (!upstream.ok) {
      return json(res, upstream.status, { error: data?.error?.message ?? 'Gemini Fehler' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = parseJsonResponse(text);
    return json(res, 200, {
      text: pickString(parsed.text, 'Ich bin kurz unsicher. Kannst du das nochmal anders formulieren?'),
      gallery: ['web', 'photo', 'video'].includes(parsed.gallery) ? parsed.gallery : undefined,
      sendEmail: parsed.sendEmail && typeof parsed.sendEmail === 'object' ? parsed.sendEmail : undefined,
    });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
