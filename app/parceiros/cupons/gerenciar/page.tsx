// app/parceiros/cupons/gerenciar/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ManageCouponsClient = dynamic(() => import("./client"), { ssr: false });

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7F4EF]" />}>
      <ManageCouponsClient />
    </Suspense>
  );
}
