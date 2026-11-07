ALTER TABLE public.restaurants ADD COLUMN google_place_id text UNIQUE;
ALTER TABLE public.menu_items ADD COLUMN source text NOT NULL DEFAULT 'sample';
ALTER TABLE public.menu_items ADD COLUMN added_by uuid;