import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Reads the restaurant's own website menu with AI. Only menus dated this year / last 3 months are kept; they wait for a person to confirm. */
export const importMenuFromWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string }) => {
    if (typeof d.placeId !== "string" || !/^[\w-]{10,200}$/.test(d.placeId)) throw new Error("Bad place");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { importWebsiteMenu } = await import("./menu-website.server");
    return importWebsiteMenu(data.placeId, context.userId);
  });
