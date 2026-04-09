"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

const HIDE_ROUTES = [
  "/auth",
  "/profile",
  "/product/",
  "/orders/",
  "/parceiros",
  "/onboarding",
  "/parceiros/login",
  "/arteig",
  "/developer",
  "/terms",
  "/novos-parceiros",
  "/partners",
  "/privacy",
];

const HIDE_EXACT = ["/"];

export default function BottomNavGate() {
  const pathname = usePathname() ?? "/";

  const shouldHide =
    HIDE_EXACT.includes(pathname) ||
    HIDE_ROUTES.some(route => pathname.startsWith(route));

  if (shouldHide) return null;

  return <BottomNav />;
}
