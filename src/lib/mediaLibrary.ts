// ⚠️ Die Daten leben in media.ts — bearbeitbar über /admin (nur lokal, npm run dev).
// Diese Datei stellt nur den Helfer bereit. (media.ts statt .json, weil JSON-Importe
// in Vercels Node-Serverless ERR_IMPORT_ATTRIBUTES werfen → Funktions-Crash.)
import mediaData, { type MediaItem } from './media.js';

export type { MediaItem };

export const mediaLibrary: MediaItem[] = mediaData;

const CATEGORY_TAGS = ['web', 'photo', 'video'];

export function getMediaByTags(tags: string[]): string[] {
  if (!tags.length) return [];

  // Wird eine Kategorie (web/photo/video) angefragt, NUR Bilder dieser
  // Kategorie zulassen — sonst rutschen über Meta-Tags wie "startscreen"
  // kategoriefremde Bilder rein (z.B. Fotos bei einer Webdesign-Frage).
  const reqCats = tags.filter(t => CATEGORY_TAGS.includes(t));
  const pool = reqCats.length
    ? mediaLibrary.filter(item => reqCats.some(c => item.tags.includes(c)))
    : mediaLibrary;

  // Primär: Bilder die ALLE Tags haben (am spezifischsten)
  const andMatch = pool.filter(item => tags.every(t => item.tags.includes(t)));
  if (andMatch.length >= 3) return andMatch.map(item => item.file);
  // Zu wenige → breiter, aber innerhalb der Kategorie: irgendein Tag passt.
  const anyMatch = pool.filter(item => tags.some(t => item.tags.includes(t)));
  const ordered = [...andMatch, ...anyMatch.filter(item => !andMatch.includes(item))];
  return ordered.map(item => item.file);
}
