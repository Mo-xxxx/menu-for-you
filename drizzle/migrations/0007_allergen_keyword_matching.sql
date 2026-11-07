CREATE OR REPLACE FUNCTION public.ingredient_allergens(p_name text, p_group text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $f$
 SELECT ARRAY(SELECT DISTINCT g FROM (
  SELECT p_group AS g WHERE p_group IS NOT NULL
  UNION ALL SELECT k.g FROM (VALUES
   ('milk', '(milk|cheese|cream|butter|yogh?urt|mozzarella|parmesan|parmigiano|burrata|ricotta|paneer|ghee|whey|feta|halloumi|mascarpone|pecorino|gorgonzola|stracciatella|dairy|b[eé]chamel|provolone|cheddar|fior di latte|scamorza|taleggio|crème|creme|labneh|kefir|custard|gelato)'),
   ('gluten', '(wheat|flour|bread|pasta|pizza|dough|spaghetti|tagliatelle|linguine|penne|rigatoni|gnocchi|couscous|barley|rye|spelt|semolina|crumb|panko|pastry|croissant|\mbuns?\M|naan|pitt?a|seitan|soy sauce|beer|batter|crouton|focaccia|ciabatta|brioche|lasagn|ravioli|tortellini|udon|ramen|biscuit|cake|wrap|bulgur|freekeh|orzo|pappardelle|fusilli|malt|egg noodle|wheat noodle)'),
   ('peanuts', '(peanut|groundnut|satay)'),
   ('sesame', '(sesame|tahini|hummus|houmous|za.?atar)'),
   ('soy', '(\msoy|soya|tofu|edamame|miso|tempeh|tamari|teriyaki)'),
   ('egg', '(\meggs?\M|mayo|aioli|meringue|frittata|omelette|carbonara|hollandaise)'),
   ('fish', '(fish|anchov|salmon|tuna|\mcod\M|haddock|sardine|mackerel|bottarga|seabass|sea bass|trout|hake|\mbass\M)'),
   ('crustaceans', '(prawn|shrimp|crab|lobster|langoustine|crayfish|scampi)'),
   ('tree_nuts', '(almond|walnut|hazelnut|cashew|pistachio|pecan|pine nut|macadamia|praline|pesto|nduja-free-never|frangipane|marzipan|nutella|brazil nut)'),
   ('mustard', '(mustard|dijon)'),
   ('celery', '(celery|celeriac)')
  ) k(g, re)
  WHERE lower(p_name) ~* k.re
   AND NOT (k.g = 'milk' AND lower(p_name) ~* '^(coconut|oat|almond|soy|soya|rice) (milk|cream)$')
   AND NOT (k.g = 'tree_nuts' AND lower(p_name) ~* '^coconut')
 ) s) $f$;

CREATE OR REPLACE FUNCTION public.find_safe_items(p_lat double precision, p_lng double precision, p_mood text, p_weather text, p_want_warm boolean DEFAULT NULL::boolean, p_want_light boolean DEFAULT NULL::boolean, p_budget numeric DEFAULT NULL::numeric)
 RETURNS TABLE(item_id uuid, item_name text, price numeric, diet_tags text[], summary_text text, allergen_confidence text, restaurant_id uuid, restaurant_name text, cuisine text, distance_m integer, key_ingredients text[], score numeric, reason_code text)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
 WITH p AS (SELECT user_id, budget_max, diet_tags, max_distance_m,
   ARRAY(SELECT CASE lower(trim(a)) WHEN 'peanut' THEN 'peanuts' WHEN 'dairy' THEN 'milk' WHEN 'lactose' THEN 'milk' WHEN 'eggs' THEN 'egg' WHEN 'wheat' THEN 'gluten' WHEN 'soya' THEN 'soy' WHEN 'nuts' THEN 'tree_nuts' WHEN 'tree nuts' THEN 'tree_nuts' WHEN 'shellfish' THEN 'crustaceans' ELSE lower(trim(a)) END FROM unnest(allergies) a) AS allergies
   FROM profiles WHERE user_id = auth.uid()),
 base AS (
 SELECT m.*, r.name AS rname, r.cuisine AS rcuisine, r.id AS rid,
 (6371000 * 2 * asin(sqrt(power(sin(radians(r.lat - p_lat)/2),2) + cos(radians(p_lat))*cos(radians(r.lat))*power(sin(radians(r.lng - p_lng)/2),2))))::int AS dist
 FROM menu_items m JOIN restaurants r ON r.id = m.restaurant_id, p
 WHERE m.review_status = 'confirmed'
 AND m.price <= LEAST(p.budget_max, COALESCE(p_budget, p.budget_max))
 AND m.diet_tags @> p.diet_tags
 AND NOT EXISTS (SELECT 1 FROM menu_item_ingredients mi JOIN ingredients i ON i.id = mi.ingredient_id WHERE mi.item_id = m.id AND public.ingredient_allergens(i.name, i.allergen_group) && p.allergies)
 AND NOT (public.ingredient_allergens(m.name || ' ' || COALESCE(m.summary_text,''), NULL) && p.allergies)
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