"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  price: number;
  store_name: string;
  created_at: string;
  stock?: number;
};

export default function DeveloperProductsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [email, setEmail] = useState<string>("");

  // ================= AUTH =================
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      if (!user?.email) {
        router.replace("/developer/login");
        return;
      }

      setEmail(user.email);

      // 🔒 (opcional mas recomendado)
      // validar se é developer
      const { data: isDev } = await supabase.rpc("is_developer", {
        p_email: user.email,
      });

      if (!isDev) {
        router.replace("/");
        return;
      }

      fetchProducts();
    })();
  }, []);

  // ================= FETCH =================
  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar produtos:", error);
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  // ================= DELETE =================
  async function handleDelete(id: string) {
    const confirmDelete = confirm("Tem certeza que quer deletar?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao deletar");
      return;
    }

    fetchProducts();
  }

  // ================= UI =================
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="text-neutral-500">Carregando...</span>
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
            Painel completo de produtos da Look
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
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white border rounded-2xl p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-medium text-black">{p.name}</div>
              <div className="text-xs text-neutral-500 mt-1">
                {p.store_name}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold">
                R$ {p.price?.toFixed(2)}
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
        ))}
      </div>
    </main>
  );
}
