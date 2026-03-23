"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: string | number;
  name: string | null;
  price_tag?: number | string | null;
  store_name?: string | null;
  created_at?: string;
};

export default function DeveloperProductsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [email, setEmail] = useState<string>("");
  const [allowed, setAllowed] = useState(false);

  // ================= AUTH =================
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;

        if (!user?.email) {
          router.replace("/developer/login");
          return;
        }

        const email = user.email.toLowerCase();
        if (!mounted) return;

        setEmail(email);

        const { data: ok, error } = await supabase.rpc(
          "developer_email_allowed",
          { p_email: email }
        );

        let isAllowed = false;

        if (error) {
          const { data: rows } = await supabase
            .from("developer_emails")
            .select("email")
            .eq("email", email)
            .eq("active", true)
            .limit(1);

          isAllowed = (rows?.length ?? 0) > 0;
        } else {
          isAllowed = !!ok;
        }

        if (!isAllowed) {
          router.replace("/");
          return;
        }

        if (mounted) {
          setAllowed(true);
        }
      } catch (err) {
        console.error("Auth error:", err);
        router.replace("/");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ================= FETCH =================
  useEffect(() => {
    if (!allowed) return;

    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, price_tag, store_name, created_at"
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!cancelled) {
          setProducts(data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    // auto refresh (igual parceiros)
    const t = setInterval(fetchProducts, 60000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [allowed]);

  // ================= DELETE =================
  async function handleDelete(id: string | number) {
    const confirmDelete = confirm("Tem certeza que quer deletar?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Erro ao deletar:", err);
      alert("Erro ao deletar produto");
    }
  }

  // ================= UI =================
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F7F4EF]">
        <span className="text-neutral-500">Carregando produtos...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EF] px-8 py-10">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Produtos</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Visão completa do catálogo da Look
          </p>
        </div>

        <div className="text-xs text-neutral-500">{email}</div>
      </div>

      {/* STATS */}
      <div className="max-w-6xl mx-auto mt-6">
        <div className="bg-white border rounded-2xl p-4 text-sm">
          Total de produtos:{" "}
          <span className="font-semibold">{products.length}</span>
        </div>
      </div>

      {/* LISTA */}
      <div className="max-w-6xl mx-auto mt-6 space-y-3">
        {products.length === 0 ? (
          <div className="rounded-2xl bg-white border p-10 text-center text-neutral-500">
            Nenhum produto encontrado.
          </div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="bg-white border rounded-2xl p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-medium text-black">
                  {p.name || "Produto sem nome"}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {p.store_name || "—"}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold">
                  R$ {Number(p.price_tag || 0).toFixed(2)}
                </div>

                <button
                  onClick={() =>
                    router.push(`/developer/products/${p.id}`)
                  }
                  className="text-xs px-3 py-1 rounded-full border"
                >
                  Editar
                </button>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs px-3 py-1 rounded-full bg-red-500 text-white"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
