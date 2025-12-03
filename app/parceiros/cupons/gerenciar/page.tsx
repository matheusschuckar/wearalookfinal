// Server component: apenas importa o wrapper client (sem "use client")
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ClientWrapper from "./client-wrapper";

export default function ManageCouponsPage() {
  return <ClientWrapper />;
}
