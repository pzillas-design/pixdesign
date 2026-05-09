import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const TO_EMAIL = 'pzillas2@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body = await req.json();
    const { fields } = body as { fields: Record<string, string> };

    const rows = Object.entries(fields)
      .map(([key, value]) => `<tr><td style="padding:6px 12px;color:#888;font-size:14px;">${key}</td><td style="padding:6px 12px;font-size:14px;font-weight:500;">${value}</td></tr>`)
      .join('');

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="font-size:20px;margin-bottom:4px;">Neue Anfrage über PIX</h2>
        <p style="color:#888;font-size:14px;margin-top:0;">Eingegangen via pix-frankfurt.de</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;background:#f9f9f9;border-radius:8px;overflow:hidden;">
          ${rows}
        </table>
      </div>
    `;

    const subject = `Neue Anfrage: ${fields['Art'] ?? fields['Betreff'] ?? 'PIX Chat'}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PIX Website <onboarding@resend.dev>',
        to: [TO_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});
