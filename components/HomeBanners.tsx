// HomeBanners.tsx
"use client";
import Link from "next/link";
import type { Banner } from "./BannersCarousel";

// util: normaliza subtitle em linhas
function subtitleLines(sub?: string | string[]) {
  if (!sub) return [] as string[];
  return Array.isArray(sub) ? sub : [sub];
}

export function EditorialTallBanner({ banner }: { banner: Banner }) {
  const to = banner.pageSlug ? `/p/${banner.pageSlug}` : banner.href ?? "#";
  const lines = subtitleLines(banner.subtitle);
  const hasTitle = typeof banner.title === "string" && banner.title.trim().length > 0;

  return (
    <Link
      href={to}
      className="col-span-2 rounded-3xl overflow-hidden relative block"
      aria-label={banner.alt ?? banner.title ?? "Editorial"}
    >
      <img
        src={banner.image}
        alt={banner.alt ?? banner.title ?? "Editorial"}
        className="w-full h-[560px] object-cover object-center"
        loading="lazy"
        decoding="async"
      />

      {/* overlay com gradiente e textos */}
      {(hasTitle || lines.length > 0) && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            {hasTitle && (
              <h3 className="text-white text-[18px] sm:text-[20px] font-semibold drop-shadow">
                {banner.title}
              </h3>
            )}
            {lines.map((ln, i) => (
              <p
                key={i}
                className="text-white/95 text-[13px] sm:text-[14px] leading-snug drop-shadow mt-1"
              >
                {ln}
              </p>
            ))}
          </div>
        </>
      )}
    </Link>
  );
}

export function SelectionHeroBanner({ banner }: { banner: Banner }) {
  const to = banner.pageSlug ? `/p/${banner.pageSlug}` : banner.href ?? "#";
  const lines = subtitleLines(banner.subtitle);
  const hasTitle = typeof banner.title === "string" && banner.title.trim().length > 0;

  return (
    <Link
      href={to}
      className="col-span-2 rounded-3xl overflow-hidden relative aspect-square bg-white block"
      aria-label={banner.alt ?? banner.title ?? "Selection"}
    >
      <img
        src={banner.image}
        alt={banner.alt ?? banner.title ?? "Selection"}
        className="absolute inset-0 w-full h-full object-contain"
        loading="lazy"
        decoding="async"
      />

      {(hasTitle || lines.length > 0) && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            {hasTitle && (
              <h4 className="text-white text-[16px] sm:text-[18px] font-semibold drop-shadow">
                {banner.title}
              </h4>
            )}
            {lines.map((ln, i) => (
              <p
                key={i}
                className="text-white/95 text-[12px] sm:text-[13px] leading-snug drop-shadow mt-1"
              >
                {ln}
              </p>
            ))}
          </div>
        </>
      )}
    </Link>
  );
}
