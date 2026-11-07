
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_tags text[] NOT NULL DEFAULT '{}',
  allergies text[] NOT NULL DEFAULT '{}',
  budget_max numeric(6,2) NOT NULL DEFAULT 15,
  max_distance_m integer NOT NULL DEFAULT 1500,
  voice_first boolean NOT NULL DEFAULT true,
  text_size text NOT NULL DEFAULT 'large',
  high_contrast boolean NOT NULL DEFAULT true,
  consent boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  setup_complete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cuisine text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  opening_hours text NOT NULL DEFAULT '',
  price_band smallint NOT NULL DEFAULT 2,
  source text NOT NULL DEFAULT 'sample',
  menu_updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read restaurants" ON public.restaurants FOR SELECT TO authenticated USING (true);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(6,2) NOT NULL,
  diet_tags text[] NOT NULL DEFAULT '{}',
  warm boolean NOT NULL DEFAULT true,
  light boolean NOT NULL DEFAULT false,
  summary_text text NOT NULL DEFAULT '',
  audio_summary_text text NOT NULL DEFAULT '',
  allergen_confidence text NOT NULL DEFAULT 'ai_inferred' CHECK (allergen_confidence IN ('verified','restaurant_stated','ai_inferred'))
);
GRANT SELECT ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read items" ON public.menu_items FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  allergen_group text
);
GRANT SELECT ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ingredients" ON public.ingredients FOR SELECT TO authenticated USING (true);

CREATE TABLE public.menu_item_ingredients (
  item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  is_key boolean NOT NULL DEFAULT false,
  PRIMARY KEY (item_id, ingredient_id)
);
GRANT SELECT ON public.menu_item_ingredients TO authenticated;
GRANT ALL ON public.menu_item_ingredients TO service_role;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read mii" ON public.menu_item_ingredients FOR SELECT TO authenticated USING (true);

CREATE TABLE public.context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood text NOT NULL,
  weather text NOT NULL DEFAULT '',
  time_of_day text NOT NULL DEFAULT '',
  distance_m integer NOT NULL DEFAULT 0,
  request_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.context_snapshots TO authenticated;
GRANT ALL ON public.context_snapshots TO service_role;
ALTER TABLE public.context_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ctx" ON public.context_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('liked','skipped','saved')),
  context_id uuid REFERENCES public.context_snapshots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.learned_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cuisine','dish')),
  value text NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  user_override boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, kind, value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learned_preferences TO authenticated;
GRANT ALL ON public.learned_preferences TO service_role;
ALTER TABLE public.learned_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.learned_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update learned preferences from events (only reorders; never touches diet/allergies)
CREATE OR REPLACE FUNCTION public.learn_from_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; d text; delta numeric;
BEGIN
  SELECT r.cuisine, m.name INTO c, d FROM menu_items m JOIN restaurants r ON r.id = m.restaurant_id WHERE m.id = NEW.item_id;
  delta := CASE NEW.type WHEN 'liked' THEN 1 WHEN 'saved' THEN 1.5 ELSE -0.5 END;
  INSERT INTO learned_preferences(user_id, kind, value, weight) VALUES (NEW.user_id, 'cuisine', c, delta)
    ON CONFLICT (user_id, kind, value) DO UPDATE SET weight = CASE WHEN learned_preferences.user_override THEN learned_preferences.weight ELSE learned_preferences.weight + delta END;
  INSERT INTO learned_preferences(user_id, kind, value, weight) VALUES (NEW.user_id, 'dish', d, delta)
    ON CONFLICT (user_id, kind, value) DO UPDATE SET weight = CASE WHEN learned_preferences.user_override THEN learned_preferences.weight ELSE learned_preferences.weight + delta END;
  RETURN NEW;
END $$;
CREATE TRIGGER events_learn AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.learn_from_event();

-- Hard filters + ranking, run as the calling user
CREATE OR REPLACE FUNCTION public.find_safe_items(p_lat double precision, p_lng double precision, p_mood text, p_weather text, p_want_warm boolean DEFAULT NULL, p_want_light boolean DEFAULT NULL, p_budget numeric DEFAULT NULL)
RETURNS TABLE (item_id uuid, item_name text, price numeric, diet_tags text[], summary_text text, allergen_confidence text,
  restaurant_id uuid, restaurant_name text, cuisine text, distance_m integer, key_ingredients text[], score numeric, reason_code text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH p AS (SELECT * FROM profiles WHERE user_id = auth.uid()),
  base AS (
    SELECT m.*, r.name AS rname, r.cuisine AS rcuisine, r.id AS rid,
      (6371000 * 2 * asin(sqrt(power(sin(radians(r.lat - p_lat)/2),2) + cos(radians(p_lat))*cos(radians(r.lat))*power(sin(radians(r.lng - p_lng)/2),2))))::int AS dist
    FROM menu_items m JOIN restaurants r ON r.id = m.restaurant_id, p
    WHERE m.price <= LEAST(p.budget_max, COALESCE(p_budget, p.budget_max))
      AND m.diet_tags @> p.diet_tags
      AND NOT EXISTS (SELECT 1 FROM menu_item_ingredients mi JOIN ingredients i ON i.id = mi.ingredient_id
                      WHERE mi.item_id = m.id AND i.allergen_group = ANY(p.allergies))
  ),
  filtered AS (SELECT b.* FROM base b, p WHERE b.dist <= p.max_distance_m),
  scored AS (
    SELECT f.*,
      COALESCE((SELECT weight FROM learned_preferences lp WHERE lp.user_id = auth.uid() AND lp.kind='cuisine' AND lp.value = f.rcuisine),0) AS wc,
      COALESCE((SELECT weight FROM learned_preferences lp WHERE lp.user_id = auth.uid() AND lp.kind='dish' AND lp.value = f.name),0) AS wd,
      (CASE WHEN p_weather IN ('cold','rain') AND f.warm THEN 1 WHEN p_weather = 'warm' AND f.light THEN 1 ELSE 0 END) AS ww,
      (CASE WHEN p_mood = 'low' AND f.warm THEN 0.8 WHEN p_mood = 'good' AND f.light THEN 0.5 ELSE 0 END) AS wm,
      (CASE WHEN p_want_warm IS TRUE AND f.warm THEN 1.2 ELSE 0 END + CASE WHEN p_want_light IS TRUE AND f.light THEN 1.2 ELSE 0 END) AS wr
    FROM filtered f
  )
  SELECT s.id, s.name, s.price, s.diet_tags, s.summary_text, s.allergen_confidence, s.rid, s.rname, s.rcuisine, s.dist,
    ARRAY(SELECT i.name FROM menu_item_ingredients mi JOIN ingredients i ON i.id = mi.ingredient_id WHERE mi.item_id = s.id AND mi.is_key ORDER BY i.name),
    round((s.wc + s.wd*1.5 + s.ww + s.wm + s.wr - s.dist/2000.0)::numeric, 2),
    CASE WHEN s.wd > 0 THEN 'liked_dish' WHEN s.wc > 0 THEN 'liked_cuisine' WHEN s.wr > 0 THEN 'matches_request' WHEN s.ww > 0 THEN 'weather' WHEN s.wm > 0 THEN 'mood' ELSE 'nearby' END
  FROM scored s
  ORDER BY 12 DESC, s.dist ASC, s.price ASC;
$$;
GRANT EXECUTE ON FUNCTION public.find_safe_items TO authenticated;
