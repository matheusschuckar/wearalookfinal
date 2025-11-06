// hooks/useInfiniteProducts.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Product } from "@/lib/data/types";

type Options = { city: string | null; pageSize?: number };

export function useInfiniteProducts({ city, pageSize = 24 }: Options) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  // reset ao trocar a cidade
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    setError(null);
    pageRef.current = 0;
  }, [city]);

  const fetchPage = useCallback(
    async (page: number) => {
      if (!city) return [] as Product[];
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const selectWithRuntime =
        "id,name,store_name,store_id,photo_url,price_tag,sizes,size_stocks,categories,gender,eta_text_runtime,eta_text,view_count,stores!inner(id,city)";
      const selectExact =
        "id,name,store_name,store_id,photo_url,price_tag,sizes,size_stocks,categories,gender,eta_text,view_count,stores!inner(id,city)";

      const attempt = async (select: string) =>
        supabase
          .from("products")
          .select(select)
          .eq("stores.city", city) // ENFORCE: city exata
          .order("id", { ascending: false })
          .range(from, to);

      let res = await attempt(selectWithRuntime);
      if (res.error) res = await attempt(selectExact);
      if (res.error) throw new Error(res.error.message);

      return (res.data ?? []) as Product[];
    },
    [city, pageSize]
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const page = pageRef.current;
      const data = await fetchPage(page);
      setItems((prev) => [...prev, ...data]);
      setHasMore(data.length === pageSize);
      pageRef.current = page + 1;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, hasMore, loading, pageSize]);

  // carrega a primeira página quando a cidade estiver pronta
  useEffect(() => {
    if (city && items.length === 0 && hasMore && !loading) {
      void loadMore();
    }
  }, [city, hasMore, items.length, loadMore, loading]);

  return { items, hasMore, loading, error, loadMore };
}
