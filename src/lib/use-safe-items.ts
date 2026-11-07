import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { findSafeItems } from "./dining.functions";
import { useLocation } from "./use-location";

export function useSafeItems(ctxId: string) {
  const loc = useLocation();
  const fn = useServerFn(findSafeItems);
  const q = useQuery({
    queryKey: ["safe", ctxId, loc?.lat, loc?.lng],
    enabled: !!loc && !!ctxId,
    queryFn: () => fn({ data: { ctxId, lat: loc!.lat, lng: loc!.lng } }),
  });
  return { ...q, loc };
}
