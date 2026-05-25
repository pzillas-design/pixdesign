# PIX Website — Agent Guide

React + TypeScript + Vite. Portfolio-Chat für Michael Pzillas (PIX), Frankfurt.

## Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Plain CSS (`src/styles.css`) — kein Tailwind, keine CSS-Module
- **Animation:** `motion/react` (Framer Motion)
- **AI:** Google Gemini (`@google/genai`) via `src/lib/gemini.ts`
- **Notifications:** Telegram Bot API (kein E-Mail-Server)
- **Deploy:** Vercel (auto-deploy bei Push auf `main` im Repo `pzillas-design/pixdesign`)
- **Domain:** pixdesign.me → Vercel (A-Record `76.76.21.21`, CNAME `www → cname.vercel-dns.com`)

## Projektstruktur

```
src/
  App.tsx              # Haupt-App: Chat-Flow, Image Strip, Lightbox, Voice
  styles.css           # Alle Styles — ein einziges File
  AdminPanel.tsx       # alte Supabase-Admin-Ansicht; nicht fuer die Live-Startseite laden
  CanvasEditor.tsx     # /canvas — visueller Chat-Baum-Editor
  lib/
    gemini.ts          # Client wrapper; ruft nur /api/... auf, keine Secrets
    systemPrompt.ts    # System-Prompt für Chat- und Voice-Bot
    mediaLibrary.ts    # Statische Medienliste (ersetzt Supabase)
    useLiveVoice.ts    # Voice-Modus Hook
    logger.ts          # Client-seitiges Logging

public/
  media/              # Alle Medien FLAT (kein Unterordner)
                      # Naming: hd_*, sq_*, thumb_*, web_PROJ_*
  pix-logo.svg
  robots.txt
  sitemap.xml
```

## Chat-Flow (`App.tsx`)

Der Chat ist ein **statischer Node-Graph** (`flow: Record<NodeId, ChatNode>`).
- Jeder Node hat: `text`, `chips[]`, `images[]`, `imageMeta[]`
- Chips navigieren zu anderen Nodes (`targetId`)
- Kontakt-Chips (`contact-call`, `contact-whatsapp`, `contact-mail`) haben `href` mit base64-kodierter URL (decode mit `atob()`)
- Der AI-Chat (Gemini) läuft parallel — User kann frei tippen statt Chips zu klicken

## Image Strip

- Zeigt `flow[activeNodeId].images` als horizontal scrollbarer Streifen
- Höhe: CSS-Variable `--strip-height` (in `:root`)
- Fade oben/unten via `mask-image` auf `.strip-shutter-frame`
- Lightbox öffnet sich per Click → `createPortal` in `document.body`

## Background Glow

- `.chat-bg-glow` — `position: fixed; z-index: -1` → via `createPortal` in `document.body`
- Bild wird als CSS-Variable `--glow-image: url(...)` gesetzt
- `::before` — geblurrtes Bild (`blur(180px) saturate(2.2)`, `opacity: 0.55`)
- `::after` — dunkles Overlay `rgba(0,0,0,0.28)`
- Basis-Hintergrundfarbe: `#1d0f08` (dunkles Braun)

## Mediathek (`src/lib/mediaLibrary.ts`)

Statische Liste aller genutzten Medien. Format:
```ts
{ file: '/media/filename.jpg', thumb?: '...', tags: ['photo','startscreen'], title?: '...', description?: '...' }
```
Tags: `web`, `photo`, `video`, `startscreen` + inhaltliche Tags

**Neue Medien hinzufügen:**
1. Datei nach `public/media/` kopieren (flat, keine Unterordner)
2. Eintrag in `src/lib/mediaLibrary.ts` ergänzen
3. In `src/App.tsx` im `flow`-Objekt referenzieren

## Umgebungsvariablen (Vercel + lokal)

`.env.local` (nicht im Repo):
```
GEMINI_API_KEY=...              # nur serverseitig, niemals VITE_
TELEGRAM_BOT_TOKEN=...          # nur serverseitig, niemals VITE_
TELEGRAM_CHAT_ID=...            # nur serverseitig, niemals VITE_
```
Auf Vercel via `npx vercel env add ...` setzen. Secrets für Gemini/Telegram dürfen nicht mit `VITE_` beginnen, weil Vite sie sonst ins Browser-Bundle schreibt.

## Gemini-Modelle

Wichtig: Modellnamen niemals raten. Vor jeder Änderung an Gemini-Modellcodes die offiziellen Quellen prüfen:

- Gemini API Models: https://ai.google.dev/gemini-api/docs/models
- Gemini API Release Notes: https://ai.google.dev/gemini-api/docs/changelog
- Gemini API Deprecations: https://ai.google.dev/gemini-api/docs/deprecations

Stand 2026-05-25 laut offizieller Models-Seite:
- Text/Chat: `gemini-3.1-flash-lite` ist für PIX aktuell gewollt und hat vorher funktioniert.
- TTS: `gemini-3.1-flash-tts-preview` ist für PIX aktuell gewollt.
- Die Models-Seite listet außerdem neuere/andere Varianten wie Gemini 3.5 Flash; vor einem Wechsel prüfen, ob der konkrete API-Code für Gemini Developer API verfügbar ist und im Projekt-Key freigeschaltet ist.

Für Produktion keine `latest`-Alias blind einsetzen. Die Google-Doku beschreibt `latest` als hot-swapped Alias; stabile, konkrete Modellcodes sind für PIX vorzuziehen.

## Deployment

```bash
git push origin main   # → Vercel deployt automatisch
```

Kein manueller Build nötig. Vercel verwendet `npm run build` (Vite).

## Lokale Entwicklung

```bash
npm install
npm run dev      # → http://localhost:4299
```

Canvas-Editor: `/canvas`

## Google Ads via Pipeboard MCP

Das Pipeboard MCP hat ein hartes Call-Limit (z.B. 30 Calls pro Periode). Sparsam damit umgehen:

- **Vor jedem Call abwägen:** Bringt dieser Call jetzt echten Mehrwert, oder kann ich die Info aus dem bisherigen Kontext ableiten?
- **Calls bündeln:** Immer so viele unabhängige Operationen wie möglich in einem einzigen parallelen Block abfeuern (z.B. 3 Kampagnen gleichzeitig erstellen statt nacheinander).
- **Kein Lookup was ich schon weiß:** Customer ID, Campaign IDs, Ad Group IDs aus dem bisherigen Gesprächsverlauf wiederverwenden — kein erneutes Abfragen wenn die Werte bekannt sind.
- **Metriken nur wenn nötig:** `get_google_ads_campaign_metrics` kostet einen Call — nur aufrufen wenn der User explizit Performance-Daten sehen will.
- **Limit im Blick behalten:** Bei ~25 verbrauchten Calls den User darauf hinweisen, dass das Limit sich nähert, bevor es knapp wird.

## Wichtige Konventionen

- **Kein Supabase fuer die Live-Seite** — alles statisch oder via Telegram. Alte Admin/Supabase-Dateien sind Altlasten und duerfen nicht in den normalen Startseiten-Bundle importiert werden.
- **Kein Tailwind** — nur `styles.css`
- **Kein Email-Server** — Anfragen gehen via Telegram Bot
- Schriftgrößen als CSS-Variablen in `:root` — nicht inline ändern
- Light/Dark Mode: CSS-Klasse `.theme-light` auf `.portfolio-chat` (nicht `prefers-color-scheme`)
