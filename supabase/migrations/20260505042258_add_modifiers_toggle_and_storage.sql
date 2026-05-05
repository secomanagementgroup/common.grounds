/*
  # Add Modifier Options, Toggle Mode, and Image Storage

  ## Overview
  Extends the coffee cart schema to support per-drink modifier options
  (e.g., milk type, size), a toggle/quick-tap mode per button, and
  modifier snapshot storage on sales records.

  ## Changes

  ### Modified Tables

  #### `drink_buttons`
  - Add `is_toggle` (boolean, default false) — when true the button records
    instantly with no modifier sheet; useful for simple items.

  #### `sales`
  - Add `modifier_labels` (text[], default '{}') — snapshot of modifier
    selections made at the time of the sale (e.g., ['Large', 'Oat Milk']).

  ### New Tables

  #### `button_modifiers`
  - Stores modifier lines linked to a drink button.
  - `id` — unique identifier
  - `button_id` — FK to drink_buttons (cascades on delete)
  - `label` — name of the modifier line (e.g., "Milk Type", "Size")
  - `options` — array of option strings (e.g., ['Small','Medium','Large'])
  - `display_order` — controls line order within a button's modifier sheet

  ### Storage
  - Creates `button-images` storage bucket for iPad photo uploads.

  ## Security
  - RLS enabled on button_modifiers with anon full access (single-user app)
  - Storage bucket policies allow anon upload, update, and public read
*/

-- Add is_toggle to drink_buttons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drink_buttons' AND column_name = 'is_toggle'
  ) THEN
    ALTER TABLE drink_buttons ADD COLUMN is_toggle boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add modifier_labels to sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'modifier_labels'
  ) THEN
    ALTER TABLE sales ADD COLUMN modifier_labels text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Create button_modifiers table
CREATE TABLE IF NOT EXISTS button_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  button_id uuid NOT NULL REFERENCES drink_buttons(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Option',
  options text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE button_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select button_modifiers"
  ON button_modifiers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon can insert button_modifiers"
  ON button_modifiers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update button_modifiers"
  ON button_modifiers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can delete button_modifiers"
  ON button_modifiers FOR DELETE
  TO anon
  USING (true);

-- Storage bucket for button images
INSERT INTO storage.buckets (id, name, public)
VALUES ('button-images', 'button-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "anon can upload button images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'button-images');

CREATE POLICY "anon can update button images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'button-images')
  WITH CHECK (bucket_id = 'button-images');

CREATE POLICY "public can read button images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'button-images');

CREATE POLICY "anon can delete button images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'button-images');
