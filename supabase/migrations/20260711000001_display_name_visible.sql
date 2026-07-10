-- Migration: add display_name_visible column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name_visible BOOLEAN NOT NULL DEFAULT true;
