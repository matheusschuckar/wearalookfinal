"use client";

import { useEffect } from "react";

export default function LandingClient() {
  const appStoreUrl =
    "https://apps.apple.com/br/app/look-moda-em-minutos/id6755046144";

  useEffect(() => {
    const start = Date.now();

    window.location.href = "look://";

    const timer = setTimeout(() => {
      const elapsed = Date.now() - start;
      if (elapsed < 2000) {
        window.location.href = appStoreUrl;
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#F6F3ED] text-black flex flex-col justify-between px-6 py-8">
      
      <header className="flex justify-between items-center">
        <span className="text-lg font-bold tracking-tight">LOOK</span>
      </header>

      <section className="flex flex-col items-center text-center mt-10">
        <h1 className="text-4xl font-semibold tracking-tight leading-tight max-w-md">
          Moda em minutos.
        </h1>

        <p className="mt-4 text-sm text-black/70 max-w-sm">
          Estamos abrindo o app da Look para você acessar peças selecionadas e receber em minutos.
        </p>

        <a
          href={appStoreUrl}
          className="mt-8 bg-black text-white text-sm px-6 py-4 rounded-xl w-full max-w-xs text-center font-medium"
        >
          Baixar na App Store
        </a>
      </section>

      <section className="flex justify-center mt-12">
        <img
          src="https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png"
          alt="Look App"
          className="w-[260px] object-contain"
        />
      </section>

      <footer className="text-center text-[10px] text-black/40 mt-10">
        © 2026 LOOK
      </footer>
    </main>
  );
}
