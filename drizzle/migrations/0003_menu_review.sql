ALTER TABLE public.menu_items ADD COLUMN review_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.menu_items ADD COLUMN confirmed_by uuid;
ALTER TABLE public.menu_items ADD COLUMN confirmed_at timestamptz;
UPDATE public.menu_items SET review_status = 'confirmed' WHERE source = 'sample';
ALTER TABLE public.restaurants ADD COLUMN website text;
ALTER TABLE public.restaurants ADD COLUMN menu_dated text;
ALTER TABLE public.restaurants ADD COLUMN menu_source_url text;

CREATE OR REPLACE FUNCTION public.review_menu_item(p_item uuid, p_ok boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  UPDATE menu_items SET review_status = CASE WHEN p_ok THEN 'confirmed' ELSE 'rejected' END,
    confirmed_by = auth.uid(), confirmed_at = now()
  WHERE id = p_item AND source <> 'sample';
END $$;
REVOKE ALL ON FUNCTION public.review_menu_item(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_menu_item(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.find_safe_items(p_lat double precision, p_lng double precision, p_mood text, p_weather text, p_want_warm boolean DEFAULT NULL, p_want_light boolean DEFAULT NULL, p_budget numeric DEFAULT NULL)
RETURNS TABLE (item_id uuid, item_name text, price numeric, diet_tags text[], summary_text text, allergen_confidence text,
  restaurant_id uuid, restaurant_name text, cuisine text, distance_m integer, key_ingredients text[], score numeric, reason_code text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH p AS (SELECT * FROM profiles WHERE user_id = auth.uid()),
  base AS (
    SELECT m.*, r.name AS rname, r.cuisine AS rcuisine, r.id AS rid,
      (6371000 * 2 * asin(sqrt(power(sin(radians(r.lat - p_lat)/2),2) + cos(radians(p_lat))*cos(radians(r.lat))*power(sin(radians(r.lng - p_lng)/2),2))))::int AS dist
    FROM menu_items m JOIN restaurants r ON r.id = m.restaurant_id, p
    WHERE m.review_status = 'confirmed'
      AND m.price <= LEAST(p.budget_max, COALESCE(p_budget, p.budget_max))
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