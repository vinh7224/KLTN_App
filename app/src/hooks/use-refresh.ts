import { useQuery } from "@tanstack/react-query";
import { store } from "@/lib/storage";

export function useRefreshMs() {
  const { data } = useQuery({
    queryKey: ["refreshMs"],
    queryFn: async () => Number((await store.get("refreshMs")) ?? 10000),
  });
  return data ?? 10000;
}