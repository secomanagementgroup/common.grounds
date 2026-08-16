import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

export interface Session {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  active_button_ids: string[] | null;
  cup_size_enabled: boolean;
  created_at: string;
}

export interface DrinkButton {
  id: string;
  label: string;
  color: string;
  image_url: string | null;
  display_order: number;
  is_toggle: boolean;
  created_at: string;
}

export interface ButtonModifier {
  id: string;
  button_id: string;
  label: string;
  options: string[];
  display_order: number;
  created_at: string;
}

export interface Sale {
  id: string;
  session_id: string;
  button_id: string | null;
  button_label: string;
  modifier_labels: string[];
  tapped_at: string;
}
