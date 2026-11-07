import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dishesSchema, DISH_RULES, isMenuCurrent, menuDateLabel, type ExtractedDish } from "./menu-schema";

const schema = {
  type: "object", additionalProperties: false, required: ["has_menu", "menu_year", "menu_month", "dishes"],
  properties: { has_menu: { type: "boolean" }, menu_year: { type: ["integer", "null"] }, menu_month: { type: ["integer", "null"], minimum: 1, maximum: 12 }, dishes: dishesSchema },
} as const;

function htmlToText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|li|h\d|tr|br)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&pound;/g, "£").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}
function safeUrl(u: string, base?: string): URL | null {
  try { const url = new URL(u, base); return url.protocol === "https:" || url.protocol === "http:" ? url : null; } catch { return null; }
}
async function getPage(url: URL) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "DiningAssistantMenuReader/1.0", Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    return (await res.text()).slice(0, 2_000_000);
  } catch { return null; }
}

/** Reads the restaurant's own website menu with AI. Only menus dated this year / last 3 months are kept; they wait for a person to confirm. */
export const importMenuFromWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string }) => {
    if (typeof d.placeId !== "string" || !/^[\w-]{10,200}$/.test(d.placeId)) throw new Error("Bad place");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { placeDetails, runMenuAI, saveDishes } = await import("./menu-store.server");
    const place = await placeDetails(data.placeId);
    const home = place.website ? safeUrl(place.website) : null;
    if (!home) return { ok: false as const, error: "This place has no website listed, so I left it as not checked." };
    const homeHtml = await getPage(home);
    if (!homeHtml) return { ok: false as const, error: "I couldn't open this place's website, so I left it as not checked." };

    // Follow up to two same-site links that look like menus.
    const links = [...homeHtml.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .filter((m) => /menu|food|eat|dishes/i.test(`${m[1]} ${m[2]}`))
      .map((m) => safeUrl(m[1]!, home)).filter((u): u is URL => !!u && u.hostname === home.hostname && !/\.pdf$/i.test(u.pathname));
    const pages = [{ url: home.href, text: htmlToText(homeHtml) }];
    for (const u of [...new Map(links.map((l) => [l.href, l])).values()].slice(0, 2)) {
      const h = await getPage(u);
      if (h) pages.push({ url: u.href, text: htmlToText(h) });
    }
    const text = pages.map((p) => `=== PAGE ${p.url} ===\n${p.text.slice(0, 30000)}`).join("\n\n").slice(0, 70000);

    const today = new Date().toISOString().slice(0, 10);
    const ai = await runMenuAI([{ type: "input_text", text: `Today is ${today}. Below is text from the website of "${place.name}". Find its food menu.
If there is no food menu with prices, set has_menu false and return no dishes.
menu_year / menu_month: the date the menu is valid for or was last updated, ONLY if the page states it (e.g. "Autumn menu 2026", "Updated October 2026", a © year next to the menu). Use null if not stated. Never guess.
${DISH_RULES}
Return JSON.\n\n${text}` }], schema);
    if (!ai.ok) return { ok: false as const, error: ai.error || "I couldn't read the menu on this website." };
    const parsed = ai.json as { has_menu: boolean; menu_year: number | null; menu_month: number | null; dishes: ExtractedDish[] };
    if (!parsed.has_menu || parsed.dishes.length === 0) return { ok: false as const, error: "I couldn't find a menu with prices on this website, so I left it as not checked." };
    const date = { year: parsed.menu_year, month: parsed.menu_month };
    if (!isMenuCurrent(date)) return { ok: false as const, error: date.year ? `The website menu is from ${menuDateLabel(date)}, which is too old. I left it as not checked.` : "The website menu has no date, so I can't tell if it's current. I left it as not checked." };
    const menuPage = pages.length > 1 ? pages[1]!.url : home.href;
    const r = await saveDishes({ place, dishes: parsed.dishes, source: "website", userId: context.userId, menuDated: `Website menu, ${menuDateLabel(date)}`, sourceUrl: menuPage });
    return { ok: true as const, restaurantId: r.restaurantId, saved: r.saved };
  });
