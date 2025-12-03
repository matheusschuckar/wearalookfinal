// app/parceiros/cupons/gerenciar/page.tsx
import dynamicImport from "next/dynamic";
import { Suspense } from "react";

const ManageCouponsClient = dynamicImport(() => import("./client"), { ssr: false });

export default function ManageCouponsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7F4EF]" />}>
      {/* client bundle (CSR) */}
      <ManageCouponsClient />
    </Suspense>
  );
}
