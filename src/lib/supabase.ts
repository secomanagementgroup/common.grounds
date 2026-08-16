import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://khtazqkurvuxkaecxtdu.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodGF6cWt1cnZ1eGthZWN4dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTE5NTcsImV4cCI6MjA5NTEyNzk1N30.lmPs9c8_7RhO_9hztPIko1pbUgsn__dCJh76kiBXVTA';

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

// Still needed for storage getPublicUrl in some code paths
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

const functionUrl = `${supabaseUrl}/functions/v1/db-proxy`;

async function dbCall(body: Record<string, unknown>): Promise<{ data?: unknown; error?: string }> {
  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `HTTP ${res.status}: ${text}` };
    }
    const json = await res.json();
    if (json.error) return { error: json.error };
    return { data: json.data };
  } catch (err) {
    return { error: String(err) };
  }
}

export const db = {
  async select<T = unknown>(table: string, order?: string, filters?: { column: string; value: unknown }[]): Promise<{ data: T[] | null; error: string | null }> {
    const r = await dbCall({ action: 'select', table, order, filters: filters?.map(f => ({ column: f.column, op: 'eq', value: f.value })) });
    return { data: r.data as T[] ?? null, error: r.error ?? null };
  },

  async insert<T = unknown>(table: string, data: Record<string, unknown> | Record<string, unknown>[]): Promise<{ data: T[] | null; error: string | null }> {
    const r = await dbCall({ action: 'insert', table, data });
    return { data: r.data as T[] ?? null, error: r.error ?? null };
  },

  async update<T = unknown>(table: string, filters: { column: string; value: unknown }[], data: Record<string, unknown>): Promise<{ data: T[] | null; error: string | null }> {
    const r = await dbCall({ action: 'update', table, filters: filters.map(f => ({ column: f.column, op: 'eq', value: f.value })), data });
    return { data: r.data as T[] ?? null, error: r.error ?? null };
  },

  async delete(table: string, filters: { column: string; value: unknown }[]): Promise<{ error: string | null }> {
    const r = await dbCall({ action: 'delete', table, filters: filters.map(f => ({ column: f.column, op: 'eq', value: f.value })) });
    return { error: r.error ?? null };
  },

  async upload(bucket: string, filename: string, fileBytes: Uint8Array, contentType: string): Promise<{ data: { path: string; publicUrl: string } | null; error: string | null }> {
    const fileData = btoa(String.fromCharCode(...fileBytes));
    const r = await dbCall({ action: 'upload', bucket, filename, fileData, contentType });
    return { data: r.data as { path: string; publicUrl: string } ?? null, error: r.error ?? null };
  },
};

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
