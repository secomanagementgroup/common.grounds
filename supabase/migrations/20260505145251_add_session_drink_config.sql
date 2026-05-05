/*
  # Add session drink configuration

  1. Modified Tables
    - `sessions`
      - `active_button_ids` (uuid[], default null) — snapshot of which drink button IDs were selected when the session was started; null means all buttons are shown (legacy support)
      - `cup_size_enabled` (boolean, default false) — whether the 12 oz / 16 oz cup size modifier is required for every drink in this session

  2. Notes
    - No breaking changes; existing sessions with null active_button_ids will continue to show all buttons
    - cup_size_enabled defaults to false so existing sessions are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'active_button_ids'
  ) THEN
    ALTER TABLE sessions ADD COLUMN active_button_ids uuid[] DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'cup_size_enabled'
  ) THEN
    ALTER TABLE sessions ADD COLUMN cup_size_enabled boolean DEFAULT false;
  END IF;
END $$;
