CREATE TABLE public.restaurant_choices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
 context_id uuid REFERENCES public.context_snapshots(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.restaurant_choices TO authenticated;
GRANT ALL ON public.restaurant_choices TO service_role;
ALTER TABLE public.restaurant_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own restaurant choices" ON public.restaurant_choices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Remove own restaurant choices" ON public.restaurant_choices FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Record own restaurant choices" ON public.restaurant_choices FOR INSERT TO authenticated WITH CHECK (
 auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.consent)
 AND (context_id IS NULL OR EXISTS (SELECT 1 FROM public.context_snapshots c WHERE c.id = context_id AND c.user_id = auth.uid()))
);
CREATE INDEX restaurant_choices_owner_date ON public.restaurant_choices(user_id, created_at DESC);
CREATE OR REPLACE FUNCTION public.find_safe_items(p_lat double precision, p_lng double precision, p_mood text, p_weather text, p_want_warm boolean DEFAULT NULL::boolean, p_want_light boolean DEFAULT NULL::boolean, p_budget numeric DEFAULT NULL::numeric)
 RETURNS TABLE(item_id uuid, item_name text, price numeric, diet_tags text[], summary_text text, allergen_confidence text, restaurant_id uuid, restaurant_name text, cuisine text, distance_m integer, key_ingredients text[], score numeric, reason_code text)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
 WITH p AS (SELECT * FROM profiles WHERE user_id = auth.uid()),
 base AS (
 SELECT m.*, r.name AS rname, r.cuisine AS rcuisine, r.id AS rid,
 (6371000 * 2 * asin(sqrt(power(sin(radians(r.lat - p_lat)/2),2) + cos(radians(p_lat))*cos(radians(r.lat))*power(sin(radians(r.lng - p_lng)/2),2))))::int AS dist
 FROM menu_items m JOIN restaurants r ON r.id = m.restaurant_id, p
 WHERE m.review_status = 'confirmed'
 AND m.price <= LEAST(p.budget_max, COALESCE(p_budget, p.budget_max))
 AND m.diet_tags @> p.diet_tags
 AND NOT EXISTS (SELECT 1 FROM menu_item_ingredients mi JOIN ingredients i ON i.id = mi.ingredient_id WHERE mi.item_id = m.id AND i.allergen_group = ANY(p.allergies))
 ),
 filtered AS (SELECT b.* FROM base b, p WHERE b.dist <= p.max_distance_m),
 scored AS (
 SELECT f.*,
 COALESCE((SELECT weight FROM learned_preferences lp WHERE lp.user_id = auth.uid() AND lp.kind='cuisine' AND lp.value = f.rcuisine),0) AS wc,
 COALESCE((SELECT weight FROM learned_preferences lp WHERE lp.user_id = auth.uid() AND lp.kind='dish' AND lp.value = f.name),0) AS wd,
 (CASE WHEN EXISTS (SELECT 1 FROM favourite_menus fm WHERE fm.user_id=auth.uid() AND fm.restaurant_id=f.rid) THEN 0.6 ELSE 0 END) AS wf,
 (CASE WHEN p_weather IN ('cold','rain') AND f.warm THEN 1 WHEN p_weather = 'warm' AND f.light THEN 1 ELSE 0 END) AS ww,
 (CASE WHEN p_mood = 'low' AND f.warm THEN 0.8 WHEN p_mood = 'good' AND f.light THEN 0.5 ELSE 0 END) AS wm,
 (CASE WHEN p_want_warm IS TRUE AND f.warm THEN 1.2 ELSE 0 END + CASE WHEN p_want_light IS TRUE AND f.light THEN 1.2 ELSE 0 END) AS wr
 FROM filtered f
 )
 SELECT s.id, s.name, s.price, s.diet_tags, s.summary_text, s.allergen_confidence, s.rid, s.rname, s.rcuisine, s.dist,
 ARRAY(SELECT i.name FROM menu_item_ingredients mi JOIN ingredients i ON i.id = mi.ingredient_id WHERE mi.item_id = s.id AND mi.is_key ORDER BY i.name),
 round((s.wc + s.wd*1.5 + s.wf + s.ww + s.wm + s.wr - s.dist/2000.0)::numeric, 2),
 CASE WHEN s.wd > 0 THEN 'liked_dish' WHEN s.wc > 0 THEN 'liked_cuisine' WHEN s.wr > 0 THEN 'matches_request' WHEN s.wf > 0 THEN 'favourite_restaurant' WHEN s.ww > 0 THEN 'weather' WHEN s.wm > 0 THEN 'mood' ELSE 'nearby' END
 FROM scored s ORDER BY 12 DESC, s.dist ASC, s.price ASC;
$function$;