'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Driver = {
  id: string;
  user_id?: string;
  full_name?: string | null;
  cpf?: string | null;
  plate?: string | null;
  city?: string | null;
  state?: string | null;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended' | 'banned' | string | null;
  created_at?: string | null;
  whatsapp?: string | null;
  street?: string | null;
  number?: string | null;
  bairro?: string | null;
  cep?: string | null;
  vehicle_type?: string | null;
  suspension_until?: string | null;
  rejection_reason?: string | null;
};

export default function EntregadoresPage() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const SURFACE = '#F7F4EF';
  const BORDER = '#E5E0DA';

  // ---------------- FETCH DRIVERS ----------------
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from('entregadores.drivers')
        .select('*')
        .order('status', { ascending: true })     // pending → approved → rejected → suspended → banned (por ordem alfabética)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error(error);
        setDrivers([]);
      } else {
        setDrivers((data as Driver[] | null) || []);
      }

      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, []);

  // ---------------- HELPERS ----------------
  function maskCPF(cpf: string | null | undefined) {
    if (!cpf) return '-';
    const c = cpf.replace(/\D/g, '');
    if (c.length !== 11) return cpf;
    return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9,11)}`;
  }

  function StatusPill({ status }: { status: string | undefined | null }) {
    const base =
      'px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center justify-center';

    const map: Record<string, string> = {
      pending: 'bg-amber-50 border-amber-300 text-amber-800',
      approved: 'bg-emerald-50 border-emerald-300 text-emerald-800',
      rejected: 'bg-red-50 border-red-300 text-red-800',
      suspended: 'bg-orange-100 border-orange-300 text-orange-800',
      banned: 'bg-red-900 border-red-900 text-white'
    };

    const s = status ?? 'pending';

    return (
      <span className={`${base} ${map[s] || 'bg-neutral-100 border-neutral-300 text-neutral-700'}`}>
        {s}
      </span>
    );
  }

  function Card(props: { children: React.ReactNode; onClick?: () => void }) {
    return (
      <div
        onClick={props.onClick}
        className="rounded-3xl p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.22)] cursor-pointer transition"
        style={{ backgroundColor: 'rgba(255,255,255,0.55)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(6px)' }}
      >
        {props.children}
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Entregadores</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/developer')}
            className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
          >
            Voltar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20">
        <h1 className="text-[32px] leading-tight font-medium tracking-tight text-black">
          Entregadores cadastrados
        </h1>
        <p className="mt-2 text-[14px] text-neutral-700 max-w-xl">
          Veja, aprove ou rejeite motoristas. Clique em um entregador para ver detalhes.
        </p>

        <div className="h-10" />

        {/* ---------------- LIST ---------------- */}
        {loading ? (
          <p className="text-neutral-600">Carregando entregadores…</p>
        ) : drivers.length === 0 ? (
          <p className="text-neutral-600">Nenhum entregador encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drivers.map((d: Driver) => (
              <Card key={d.id} onClick={() => router.push(`/developer/entregadores/${d.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{d.full_name || 'Sem nome'}</h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      CPF: {maskCPF(d.cpf)} • Placa: {d.plate?.toUpperCase() || '-'}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {d.city || 'Cidade não informada'} - {d.state || ''}
                    </p>
                  </div>

                  <StatusPill status={d.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
