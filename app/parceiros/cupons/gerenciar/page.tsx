// app/parceiros/cupons/gerenciar/page.tsx
// NOTE: THIS IS A SERVER COMPONENT (no "use client" here)

export const dynamic = "force-dynamic";
export const revalidate = 0;

import ManageCouponsClient from "./client";

export default function ManageCouponsPage() {
  // Render the client component directly (it must have "use client" at top of client.tsx)
  return <ManageCouponsClient />;
}
