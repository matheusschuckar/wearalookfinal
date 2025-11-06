"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function PartnerLoginInner() {
  const router = useRouter();
  const search = useSearchParams();

  const nextRaw = search?.get("next") || "/parceiros";
  const next = useMemo(() => {
    try {
      const d = decodeURIComponent(nextRaw);
      if (/^https?:\/\//i.test(d)) return "/parceiros";
      return d || "/parceiros";
    } catch {
      return "/parceiros";
    }
  }, [nextRaw]);

  const [email, setEmail] = useState(() => search?.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Se já há sessão, só deixa passar se o e-mail for autorizado
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user;
      if (!u) return;

      const currentEmail = u.email?.toLowerCase() ?? "";
      try {
        const { data: allowed, error } = await supabase.rpc(
          "partner_email_allowed",
          { p_email: currentEmail }
        );
        if (error) throw error;

        if (allowed) {
          router.replace(next);
        } else {
          await supabase.auth.signOut({ scope: "local" });
          setNotice(
            "Você estava logado com uma conta não-autorizada para parceiros. Faça login com o e-mail da marca."
          );
        }
      } catch {
        // Em caso de erro no RPC, sai por segurança
        await supabase.auth.signOut({ scope: "local" });
      }
    })();
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error("Informe um e-mail válido.");
      if (!password || password.length < 6) throw new Error("Senha inválida.");

      // 1) Whitelist
      const { data: allowed, error: allowErr } = await supabase.rpc(
        "partner_email_allowed",
        { p_email: cleanEmail }
      );
      if (allowErr) throw allowErr;
      if (!allowed) {
        throw new Error("Este e-mail não está autorizado como parceiro.");
      }

      // 2) Login com senha
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          throw new Error("E-mail ou senha incorretos.");
        }
        throw error;
      }

      router.replace(next);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e) || "Não foi possível fazer login agora.");
    } finally {
      setLoading(false);
    }
  }

  // Look palette
  const SURFACE = "#F9F7F5";
  const SURFACE_STRONG = "#EFEAE3";
  const BORDER = "#E6E1DB";

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* Header */}
      <div className="mx-auto max-w-md px-5 pt-10">
        <h1 className="text-4xl font-semibold tracking-tight text-black">
          Parceiros
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Acesse o painel da sua marca
        </p>
        {notice && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {notice}
          </p>
        )}
      </div>

      {/* Card */}
      <div className="mx-auto mt-6 max-w-md px-5">
        <div
          className="rounded-2xl p-6 shadow-[0_6px_24px_-10px_rgba(0,0,0,0.18)]"
          style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <div className="mb-6">
            <div
              className="relative grid grid-cols-1 rounded-xl p-1"
              style={{ backgroundColor: SURFACE_STRONG }}
            >
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 right-1 rounded-lg shadow-sm"
                style={{ backgroundColor: SURFACE }}
              />
              <div className="relative z-10 h-9 grid place-items-center text-sm font-semibold">
                Login de Parceiros
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                E-mail da marca
              </label>
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                }}
                placeholder="parceiro@sualoja.com"
                autoComplete="email"
              />
            </div>

            {/* Password + Forgot */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-800">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/auth/otp")}
                  className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl pr-10 px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${BORDER}`,
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 mr-2 grid w-8 place-items-center rounded-lg text-neutral-500 hover:text-neutral-800"
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M2 2l20 20M9.88 9.88A3 3 0 01114.12 14.12M10.73 5.08A9.78 9.78 0 0112 5c5.52 0 10 5 10 7-0.34 0.62-1.14 1.67-2.45 2.8M6.1 6.1C3.86 7.66 2.34 9.72 2 12c0 2 4.48 7 10 7 1.17 0 2.3-.2 3.36-.57" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {err && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] leading-5 text-neutral-500">
            Acesso restrito a marcas parceiras da Look.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-50" />}>
      <PartnerLoginInner />
    </Suspense>
  );
}
