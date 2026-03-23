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
  const [allowed, setAllowed] = useState<boolean | null>(null);

  // ================= AUTH (ALINHADO COM HOME) =================
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
          setAllowed(false);
          return;
        }

        const email = user.email.toLowerCase();
        if (!mounted) return;

        setEmail(email);

        const { data: ok, error } = await supabase.rpc(
          "developer_email_allowed",
          { p_email: email }
        );

        if (error) {
          const { data: rows } = await supabase
            .from("developer_emails")
            .select("email")
            .eq("email", email)
            .eq("active", true)
            .limit(1);

          setAllowed((rows?.length ?? 0) > 0);
        } else {
          setAllowed(!!ok);
        }
      } catch (err) {
        console.error(err);
        setAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ================= FETCH =================
  useEffect(() => {
    if (allowed !== true) return;

    let cancelled = false;

    const load = async () => {
      try {
        console.log("BUSCANDO PRODUTOS...");

        const { data, error } = await supabase
          .from("products")
          .select("*");

        console.log("RESULTADO:", data, error);

        if (error) throw error;

        if (!cancelled) {
          setProducts(data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      }
    };

    load();

    const t = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [allowed]);

  // ================= DELETE =================
  async function handleDelete(id: string | number) {
    const ok = confirm("Tem certeza que quer deletar?");
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao deletar");
    }
  }

  // ================= GUARD =================
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F7F4EF]">
        <span className="text-neutral-500">Carregando...</span>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F7F4EF]">
        <span className="text-neutral-500">
          Acesso restrito ao developer
        </span>
      </main>
    );
  }

  // ================= UI =================
  return (
    <main className="min-h-screen bg-[#F7F4EF] px-8 py-10">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Produtos</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Catálogo completo da Look
          </p>
        </div>

        <div className="text-xs text-neutral-500">{email}</div>
      </div>

      <div className="max-w-6xl mx-auto mt-6">
        <div className="bg-white border rounded-2xl p-4 text-sm">
          Total: <span className="font-semibold">{products.length}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 space-y-3">
        {products.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center text-neutral-500">
            Nenhum produto encontrado
          </div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="bg-white border rounded-2xl p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {p.name || "Sem nome"}
                </div>
                <div className="text-xs text-neutral-500">
                  {p.store_name}
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
                  className="text-xs px-3 py-1 border rounded-full"
                >
                  Editar
                </button>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs px-3 py-1 bg-red-500 text-white rounded-full"
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
