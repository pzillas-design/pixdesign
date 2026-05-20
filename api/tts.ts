import { handleOptions, json, pickString, readBody } from './_shared';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'Gemini nicht konfiguriert' });

  try {
    const body = await readBody(req);
    const text = pickString(body.text).slice(0, 1200);
    if (!text) return json(res, 400, { error: 'Leerer Text' });

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`,
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
    const data = await upstream.json();
    if (!upstream.ok) return json(res, upstream.status, { error: data?.error?.message ?? 'Gemini TTS Fehler' });
    return json(res, 200, { audio: data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
