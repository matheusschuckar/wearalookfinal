// /app/privacy/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Look",
  description: "Política de Privacidade do Look Marketplace — Vigência: 11 de novembro de 2025",
};

const SURFACE = "#F9F7F5";
const BORDER = "#E6E1DB";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen py-12" style={{ backgroundColor: SURFACE }}>
      <div className="mx-auto max-w-4xl px-6">
        <Link href="/auth" className="inline-block mb-6 text-sm font-medium underline">
          Voltar
        </Link>

        <div
          className="rounded-2xl p-8 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.18)]"
          style={{ backgroundColor: "white", border: `1px solid ${BORDER}` }}
        >
          <header className="mb-6">
            <h1 className="text-3xl font-semibold">Política de Privacidade</h1>
            <p className="mt-2 text-sm text-neutral-600">Vigência: 11 de novembro de 2025</p>
          </header>

          <section className="prose max-w-none text-neutral-800">
            <p>
              A Look Marketplace valoriza sua privacidade. Esta política explica quais dados
              coletamos, por que coletamos e como você pode gerir suas informações.
            </p>

            <h2>1. Escopo</h2>
            <p>
              Esta Política de Privacidade aplica-se ao uso do aplicativo e site Look Marketplace e
              às interações entre usuários, marcas parceiras e a Look.
            </p>

            <h2>2. Dados que coletamos</h2>
            <ol>
              <li>Identificação: nome completo, CPF.</li>
              <li>Contato: e-mail, telefone.</li>
              <li>
                Endereço: endereço de entrega (logradouro, número, complemento, bairro, cidade, CEP).
              </li>
              <li>Dados de pedido: histórico de compras, preferências de estilo.</li>
              <li>
                Dados de pagamento: atualmente não armazenamos dados de cartão. Pagamentos são
                processados via Pix.
              </li>
              <li>Dados técnicos: informações de dispositivo, IP, logs, gerados automaticamente.</li>
            </ol>

            <h2>3. Finalidades do processamento</h2>
            <p>
              Processamos seus dados para executar contratos, processar pagamentos e repasses,
              organizar e executar a entrega dos produtos, comunicar atualizações, personalizar a
              experiência, prevenir fraudes e realizar análise de uso via Google Analytics.
            </p>

            <h2>4. Base legal</h2>
            <p>
              Tratamos dados com base em execução de contrato, consentimento quando necessário,
              interesse legítimo para prevenção de fraudes e cumprimento de obrigação legal quando
              aplicável.
            </p>

            <h2>5. Compartilhamento de dados</h2>
            <p>
              Compartilhamos seus dados apenas quando necessário e com marcas parceiras para
              processar seu pedido e coordenar entrega, provedores de serviços (hospedagem e
              analytics) e autoridades legais quando exigido por lei.
            </p>

            <h2>6. Ferramentas e armazenamento</h2>
            <p>
              Dados operacionais e de usuários são armazenados pela Look em Supabase. Utilizamos
              Google Analytics para fins de análise de uso.
            </p>

            <h2>7. Retenção</h2>
            <p>
              Reteremos seus dados pelo tempo necessário para cumprir finalidades contratuais,
              obrigações legais e resolução de disputas. Após esse período, os dados serão
              eliminados ou anonimizados de acordo com nossa política interna.
            </p>

            <h2>8. Seus direitos (LGPD)</h2>
            <p>
              Você tem direito à confirmação da existência de tratamento, acesso, correção,
              eliminação, portabilidade e revogação de consentimento. Para exercer seus direitos,
              entre em contato pelo e-mail <em>email@look.com</em> (substituir).
            </p>

            <h2>9. Segurança</h2>
            <p>
              Adotamos medidas técnicas e administrativas razoáveis para proteger seus dados. Em
              caso de incidente com risco real aos titulares, comunicaremos às autoridades
              competentes e aos titulares conforme a legislação.
            </p>

            <h2>10. Cookies e rastreamento</h2>
            <p>
              Usamos cookies e tecnologias semelhantes e Google Analytics. Você pode configurar seu
              navegador para recusar cookies, o que pode afetar funcionalidades do site.
            </p>

            <h2>11. Transferência internacional</h2>
            <p>
              Se houver transferência internacional de dados, tomaremos medidas para garantir nível
              de proteção compatível com a legislação aplicável.
            </p>

            <h2>12. Menores de idade</h2>
            <p>
              Nossos serviços não são destinados a menores de 18 anos. Não coletamos conscientemente
              dados pessoais de menores. Se souber que coletamos dados de um menor, entre em contato
              para remoção.
            </p>

            <h2>13. Alterações na Política</h2>
            <p>
              Podemos atualizar esta Política. Alterações significativas serão comunicadas no app ou
              por e-mail. A versão vigente terá a data de atualização no topo da página.
            </p>

            <h2>14. Contato</h2>
            <p>
              Dúvidas, solicitações de acesso ou reclamações: <em>team@wearalook.com</em> (substituir).
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
