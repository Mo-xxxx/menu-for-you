import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { findSafeItems } from "./dining.functions";
import { useLocation } from "./use-location";

export function useSafeItems(ctxId: string, restaurantId?: string) {
  const { loc, status, retry } = useLocation();
  const fn = useServerFn(findSafeItems);
  const q = useQuery({
    queryKey: ["safe", ctxId, loc?.actual.lat, loc?.actual.lng, restaurantId],
    enabled: !!loc,
    queryFn: () => {
      if (!loc) throw new Error("Choose a location first");
      return fn({ data: { ctxId, lat: loc.actual.lat, lng: loc.actual.lng, ...(restaurantId ? { restaurantId } : {}) } });
    },
  });
  return { ...q, loc, locStatus: status, retryLocation: retry };
}
