import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export type PixMedia = {
  id: string;
  storage_path: string;
  url: string;
  filename: string;
  alt: string;
  tags: string[];
  theme: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
};

export type PixFlowNode = {
  id: string;
  text: string;
  chips: Array<{ label: string; targetId: string; icon?: string }>;
  media_ids: string[];
  image_mode: string;
  sort_order: number;
  updated_at: string;
};

export type PixAiConfig = {
  id: string;
  base_prompt: string;
  about_pix: string;
  persona_tone: string;
};
