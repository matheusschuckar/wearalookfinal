"use client";

import ManageCouponsClient from "./client";

/**
 * Client wrapper: garante que estamos em um componente cliente.
 * Importa o cliente real e o retorna. Mantém a separação Server/Client limpa.
 */
export default function ClientWrapper() {
  return <ManageCouponsClient />;
}
