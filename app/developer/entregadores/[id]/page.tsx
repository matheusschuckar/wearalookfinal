'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';

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

type DocumentRow = {
  id: string;
  driver_id?: string;
  doc_type?: string | null; // e.g., 'CNH', 'SELFIE', 'ADDRESS_PROOF'
  url?: string | null;
  created_at?: string | null;
};

const SURFACE = '#F7F4EF';
const BORDER = '#E5E0DA';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-3xl p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_40px_-16px_rgba(0,0,0,0.22)] transition"
      style={{
        backgroundColor: 'rgba(255,255,255,0.55)',
        border: `1px solid ${BORDER}`,
        backdropFilter: 'blur(6px)'
      }}
    >
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string | undefined | null }) {
  const base =
    'px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center justify-center';

  const map: Record<string, string> = {
    pending: 'bg-amber-50 border-amber-300 text-amber-800',
    approved: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    rejected: 'bg-red-50 border-red-300 text-red-800',
    suspended: 'bg-orange-100 border-orange-300 text-orange-800',
    banned: 'bg-red-900 border-red-900 text-white',
  };

  const s = status ?? 'pending';

  return (
    <span className={`${base} ${map[s] || 'bg-neutral-100 border-neutral-300 text-neutral-700'}`}>
      {s}
    </span>
  );
}

export default function EntregadorSlugPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [rejectionModal, setRejectionModal] = useState<boolean>(false);
  const [suspensionModal, setSuspensionModal] = useState<boolean>(false);
  const [rejectionText, setRejectionText] = useState<string>('');

  // ---------------- LOAD DRIVER ----------------
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: d, error: e1 } = await supabase
        .from('entregadores.drivers')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (e1 || !d?.length) {
        setDriver(null);
        setLoading(false);
        return;
      }

      setDriver((d as Driver[])[0]);

      const { data: docs } = await supabase
        .from('entregadores.driver_documents')
        .select('*')
        .eq('driver_id', id);

      setDocuments((docs as DocumentRow[] | null) || []);

      setLoading(false);
    }

    load();
  }, [id]);

  // ---------------- UPDATE STATUS ----------------
  async function updateStatus(status: Driver['status'], extra: Record<string, unknown> = {}) {
    const payload = { status, ...extra };

    const { error } = await supabase
      .from('entregadores.drivers')
      .update(payload)
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status.');
      return;
    }

    // recarrega a página / dados
    router.refresh();
  }

  function getDoc(type: string) {
    return documents.find((d) => d.doc_type === type);
  }

  // ---------------- SUSPEND ----------------
  async function suspendFor(days: number) {
    const until = new Date();
    until.setDate(until.getDate() + days);

    await updateStatus('suspended', {
      suspension_until: until.toISOString()
    });

    setSuspensionModal(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen p-10" style={{ backgroundColor: SURFACE }}>
        Carregando…
      </main>
    );
  }

  if (!driver) {
    return (
      <main className="min-h-screen p-10" style={{ backgroundColor: SURFACE }}>
        Entregador não encontrado.
      </main>
    );
  }

  const cnh = getDoc('CNH');
  const selfie = getDoc('SELFIE');
  const proof = getDoc('ADDRESS_PROOF');

  // status atual
  const status = driver.status ?? 'pending';

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* Topbar */}
      <header className="w-full border-b border-[#E5E0DA]/80 bg-[#F7F4EF]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-[13px] font-semibold tracking-tight text-white leading-none">L</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">Look</span>
              <span className="text-[11px] text-neutral-500">Entregador</span>
            </div>
          </div>

          <button
            className="h-9 rounded-full px-4 text-xs font-medium text-neutral-700 hover:text-black transition border border-neutral-300/70 bg-white/70"
            onClick={() => router.push('/developer/entregadores')}
          >
            Voltar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 pt-10 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-medium tracking-tight text-black">
            {driver.full_name}
          </h1>
          <StatusPill status={driver.status} />
        </div>

        <p className="mt-2 text-sm text-neutral-600">
          Cadastro criado em: {driver.created_at ? new Date(driver.created_at).toLocaleString('pt-BR') : '—'}
        </p>

        <div className="h-8" />

        {/* ---------------- INFO ---------------- */}
        <Card>
          <h2 className="text-lg font-semibold text-black mb-4">Informações pessoais</h2>

          <p><strong>CPF:</strong> {driver.cpf ?? '—'}</p>
          <p><strong>WhatsApp:</strong> {driver.whatsapp ?? '—'}</p>
          <p><strong>Endereço:</strong> {driver.street ?? '—'}, {driver.number ?? '—'} — {driver.bairro ?? '—'}</p>
          <p><strong>Cidade:</strong> {driver.city ?? '—'} — {driver.state ?? '—'}</p>
          <p><strong>CEP:</strong> {driver.cep ?? '—'}</p>
          <p><strong>Placa:</strong> {driver.plate ?? '—'}</p>
          <p><strong>Tipo de veículo:</strong> {driver.vehicle_type ?? '—'}</p>

          {driver.suspension_until && (
            <p className="mt-2 text-red-700 font-medium">
              Suspenso até {new Date(driver.suspension_until).toLocaleString('pt-BR')}
            </p>
          )}

          {driver.rejection_reason && (
            <p className="mt-2 text-red-700">
              Motivo da rejeição: {driver.rejection_reason}
            </p>
          )}
        </Card>

        <div className="h-8" />

        {/* ---------------- DOCUMENTOS ---------------- */}
        <Card>
          <h2 className="text-lg font-semibold text-black mb-6">Documentos enviados</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CNH */}
            <div>
              <p className="font-medium mb-2">CNH</p>
              {cnh?.url ? (
                <img src={cnh.url} className="rounded-xl border border-neutral-300" alt="CNH" />
              ) : (
                <p className="text-neutral-500 text-sm">Não enviado</p>
              )}
            </div>

            {/* SELFIE */}
            <div>
              <p className="font-medium mb-2">Selfie</p>
              {selfie?.url ? (
                <img src={selfie.url} className="rounded-xl border border-neutral-300" alt="Selfie" />
              ) : (
                <p className="text-neutral-500 text-sm">Não enviada</p>
              )}
            </div>

            {/* COMPROVANTE */}
            <div>
              <p className="font-medium mb-2">Comprovante de endereço</p>
              {proof?.url ? (
                <img src={proof.url} className="rounded-xl border border-neutral-300" alt="Comprovante" />
              ) : (
                <p className="text-neutral-500 text-sm">Não enviado</p>
              )}
            </div>
          </div>
        </Card>

        <div className="h-10" />

        {/* ---------------- AÇÕES ---------------- */}
        <Card>
          <h2 className="text-lg font-semibold text-black mb-6">Ações</h2>

          <div className="flex flex-wrap gap-3">
            {/* APROVAR - só quando estiver pending */}
            {status === 'pending' && (
              <button
                onClick={() => updateStatus('approved')}
                className="h-11 px-6 rounded-full bg-black text-white text-sm font-medium hover:opacity-90"
              >
                Aprovar
              </button>
            )}

            {/* REJEITAR - disponível enquanto pending */}
            {status === 'pending' && (
              <button
                onClick={() => setRejectionModal(true)}
                className="h-11 px-6 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Rejeitar
              </button>
            )}

            {/* SUSPENDER - só quando já aprovado */}
            {status === 'approved' && (
              <button
                onClick={() => setSuspensionModal(true)}
                className="h-11 px-6 rounded-full bg-orange-600 text-white text-sm font-medium hover:bg-orange-700"
              >
                Suspender
              </button>
            )}

            {/* BANIR - só quando já aprovado */}
            {status === 'approved' && (
              <button
                onClick={() => {
                  if (!confirm('Tem certeza que quer banir permanentemente este entregador?')) return;
                  updateStatus('banned');
                }}
                className="h-11 px-6 rounded-full bg-red-900 text-white text-sm font-medium hover:bg-red-800"
              >
                Banir permanentemente
              </button>
            )}

            {/* se já for banned, permitir apenas ver e (opcional) reverter? */}
            {status === 'banned' && (
              <button
                onClick={() => {
                  if (!confirm('Reverter banimento e colocar como rejected?')) return;
                  updateStatus('rejected');
                }}
                className="h-11 px-6 rounded-full border border-neutral-300 text-sm font-medium"
              >
                Reverter ban (marcar rejected)
              </button>
            )}
          </div>
        </Card>

        {/* ---------------- MODAL REJEIÇÃO ---------------- */}
        {rejectionModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-neutral-200">
              <h3 className="text-lg font-semibold mb-4">Motivo da rejeição</h3>

              <textarea
                className="w-full h-32 border border-neutral-300 rounded-xl p-3 text-sm"
                placeholder="Descreva o motivo…"
                value={rejectionText}
                onChange={(e) => setRejectionText(e.target.value)}
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  className="px-4 py-2 text-sm rounded-full border border-neutral-300"
                  onClick={() => setRejectionModal(false)}
                >
                  Cancelar
                </button>
                <button
                  disabled={!rejectionText.trim()}
                  onClick={() => {
                    updateStatus('rejected', { rejection_reason: rejectionText.trim() });
                    setRejectionText('');
                    setRejectionModal(false);
                  }}
                  className="px-4 py-2 text-sm rounded-full bg-red-600 text-white"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- MODAL SUSPENSÃO ---------------- */}
        {suspensionModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-neutral-200">
              <h3 className="text-lg font-semibold mb-4">Suspender entregador</h3>
              <p className="text-sm text-neutral-700 mb-4">
                Selecione o período da suspensão:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[3, 7, 15, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => suspendFor(days)}
                    className="h-11 bg-orange-600 text-white rounded-full hover:bg-orange-700 text-sm"
                  >
                    {days} dias
                  </button>
                ))}
              </div>

              <button
                className="mt-4 w-full py-2 text-sm rounded-full border border-neutral-300"
                onClick={() => setSuspensionModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
