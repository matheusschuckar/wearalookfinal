// app/parceiros/cupons/gerenciar/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import ManageCouponsClient from "./client";

export default function ManageCouponsPage() {
  return <ManageCouponsClient />;
}
