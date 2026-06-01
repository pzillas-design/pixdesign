// ⚠️ Die Daten leben in media.json — bearbeitbar über /admin (nur lokal, npm run dev).
// Diese Datei stellt nur Typ + Helfer bereit.
import mediaData from './media.json';

export type MediaItem = {
  file: string;
  thumb?: string;
  tags: string[];
  title?: string;
  description?: string;
};

export const mediaLibrary: MediaItem[] = mediaData as MediaItem[];

export function getMediaByTags(tags: string[]): string[] {
  if (!tags.length) return [];
  // Primär: Bilder die ALLE Tags haben (am spezifischsten)
  const andMatch = mediaLibrary.filter(item => tags.every(t => item.tags.includes(t)));
  if (andMatch.length >= 3) return andMatch.map(item => item.file);
  // Zu wenige Treffer → breiter: Bilder die IRGENDEINEN Tag haben.
  // AND-Treffer zuerst, dann der Rest — so bleibt es relevant, aber gefüllt.
  const anyMatch = mediaLibrary.filter(item => tags.some(t => item.tags.includes(t)));
  const ordered = [...andMatch, ...anyMatch.filter(item => !andMatch.includes(item))];
  return ordered.map(item => item.file);
}
