// Exercise the actual migration's Postgres function, not a UI imitation of safety logic.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const user = "11111111-1111-1111-1111-111111111111";
const restaurant = "22222222-2222-2222-2222-222222222222";
const otherRestaurant = "33333333-3333-3333-3333-333333333333";
beforeAll(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${user}'::uuid$$;
    CREATE TABLE profiles(user_id uuid, budget_max numeric, diet_tags text[], allergies text[], max_distance_m integer);
    CREATE TABLE restaurants(id uuid, name text, cuisine text, lat float8, lng float8);
    CREATE TABLE menu_items(id uuid, restaurant_id uuid, name text, price numeric, diet_tags text[], review_status text, warm boolean, light boolean, summary_text text, allergen_confidence text);
    CREATE TABLE ingredients(id uuid, name text, allergen_group text);
    CREATE TABLE menu_item_ingredients(item_id uuid, ingredient_id uuid, is_key boolean);
    CREATE TABLE learned_preferences(user_id uuid, kind text, value text, weight numeric);
    CREATE TABLE favourite_menus(user_id uuid, restaurant_id uuid);
    INSERT INTO profiles VALUES ('${user}',15,ARRAY['vegan'],ARRAY['peanuts'],1500);
    INSERT INTO restaurants VALUES ('${restaurant}','Favourite','Thai',51.5,0), ('${otherRestaurant}','Other','Thai',51.5,0);
    INSERT INTO favourite_menus VALUES ('${user}','${restaurant}');
    INSERT INTO menu_items SELECT ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid, '${restaurant}'::uuid,'dish-'||n,10,ARRAY['vegan'],'confirmed',true,false,'','ai_inferred' FROM generate_series(1,5) n;
    UPDATE menu_items SET diet_tags=ARRAY['vegetarian'] WHERE name='dish-2';
    UPDATE menu_items SET price=16 WHERE name='dish-3';
    UPDATE menu_items SET review_status='pending' WHERE name='dish-4';
    INSERT INTO ingredients VALUES ('44444444-4444-4444-4444-444444444444','may contain peanuts','peanuts');
    INSERT INTO menu_item_ingredients VALUES ('00000000-0000-0000-0000-000000000005','44444444-4444-4444-4444-444444444444',true);
    INSERT INTO menu_items VALUES ('00000000-0000-0000-0000-000000000006','${otherRestaurant}','other',10,ARRAY['vegan'],'confirmed',true,false,'','ai_inferred');`);
  const migration = readFileSync("drizzle/migrations/0006_restaurant_choice_records_and_favourite_ranking.sql", "utf8");
  const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.find_safe_items");
  if (start < 0) throw new Error("Recommendation function missing from migration");
  await db.exec(migration.slice(start));
}, 30000);
afterAll(() => db.close());
async function find(lat = 51.5) {
  return (await db.query<{ item_name: string; score: string; reason_code: string }>("SELECT * FROM find_safe_items($1,0,'okay','mild')", [lat])).rows;
}
it("favourite restaurant gets only a soft 0.6 boost after filtering", async () => {
  const rows = await find();
  expect(rows.map(r => r.item_name)).toEqual(["dish-1", "other"]);
  expect(Number(rows[0]?.score)).toBe(0.6);
  expect(Number(rows[1]?.score)).toBe(0);
  expect(rows[0]?.reason_code).toBe("favourite_restaurant");
});
it("favourites never bypass the vegan diet", async () => expect((await find()).some(r => r.item_name === "dish-2")).toBe(false));
it("favourites never bypass the £15 budget", async () => expect((await find()).some(r => r.item_name === "dish-3")).toBe(false));
it("AI-read pending dishes never become recommendations through favourites", async () => expect((await find()).some(r => r.item_name === "dish-4")).toBe(false));
it("may-contain peanuts exclude a dish for a peanut allergy", async () => expect((await find()).some(r => r.item_name === "dish-5")).toBe(false));
it("favourites never bypass the 1500 metre limit", async () => expect(await find(52)).toEqual([]));