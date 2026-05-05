/*
  # Coffee Cart Drink Tracker — Initial Schema

  ## Overview
  Creates the three core tables needed for the coffee cart tracker app:
  sessions, drink_buttons, and sales.

  ## New Tables

  ### 1. `sessions`
  Represents a named time frame or event (e.g., "Saturday Market 9am–1pm").
  - `id` — unique identifier
  - `name` — human-readable session name
  - `started_at` — when the session was opened
  - `ended_at` — when the session was closed (null = still active)
  - `is_active` — whether this is the currently active session
  - `created_at` — record creation timestamp

  ### 2. `drink_buttons`
  Stores each customizable drink button shown on the tracker grid.
  - `id` — unique identifier
  - `label` — button display name (e.g., "Latte", "Cold Brew")
  - `color` — hex background color for the button
  - `image_url` — optional image URL to display on the button
  - `display_order` — controls the order buttons appear in the grid
  - `created_at` — record creation timestamp

  ### 3. `sales`
  Records every drink tap, linking to a button and a session.
  - `id` — unique identifier
  - `session_id` — which session this sale belongs to
  - `button_id` — which drink button was tapped (nullable if button later deleted)
  - `button_label` — snapshot of the button label at time of sale
  - `tapped_at` — exact timestamp of the tap

  ## Security
  - RLS enabled on all three tables
  - Policies allow full access to all rows (no auth required — single-user app with no login)
    using anon role explicitly so policies remain intentional

  ## Notes
  - `button_label` is stored as a snapshot on each sale so historical data
    remains accurate even if a button is later renamed or deleted
  - Only one session should have `is_active = true` at a time;
    enforced by application logic
*/

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select sessions"
  ON sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon can insert sessions"
  ON sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update sessions"
  ON sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can delete sessions"
  ON sessions FOR DELETE
  TO anon
  USING (true);

-- Drink buttons table
CREATE TABLE IF NOT EXISTS drink_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'New Drink',
  color text NOT NULL DEFAULT '#3B82F6',
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE drink_buttons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select drink_buttons"
  ON drink_buttons FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon can insert drink_buttons"
  ON drink_buttons FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update drink_buttons"
  ON drink_buttons FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can delete drink_buttons"
  ON drink_buttons FOR DELETE
  TO anon
  USING (true);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  button_id uuid REFERENCES drink_buttons(id) ON DELETE SET NULL,
  button_label text NOT NULL DEFAULT '',
  tapped_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select sales"
  ON sales FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon can insert sales"
  ON sales FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update sales"
  ON sales FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can delete sales"
  ON sales FOR DELETE
  TO anon
  USING (true);

-- Seed a few default drink buttons so the app is useful immediately
INSERT INTO drink_buttons (label, color, display_order) VALUES
  ('Latte', '#C2855A', 1),
  ('Cappuccino', '#8B5E3C', 2),
  ('Espresso', '#4A2C17', 3),
  ('Cold Brew', '#2C4A6E', 4),
  ('Americano', '#5C3D2E', 5),
  ('Matcha Latte', '#5A7A4A', 6)
ON CONFLICT DO NOTHING;
