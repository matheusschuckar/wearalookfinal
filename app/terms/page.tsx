// /app/terms/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Termos de Uso — Look",
  description:
    "Termos de Uso do Look Marketplace — Vigência: 11 de novembro de 2025",
};

const SURFACE = "#F9F7F5";
const BORDER = "#E6E1DB";

export default function TermsPage() {
  return (
    <main className="min-h-screen py-12" style={{ backgroundColor: SURFACE }}>
      <div className="mx-auto max-w-4xl px-6">
        <Link
          href="/auth"
          className="inline-block mb-6 text-sm font-medium underline"
        >
          Voltar
        </Link>

        <div
          className="rounded-2xl p-8 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.18)]"
          style={{ backgroundColor: "white", border: `1px solid ${BORDER}` }}
        >
          <header className="mb-6">
            <h1 className="text-3xl font-semibold">Termos de Uso</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Vigência: 11 de novembro de 2025
            </p>
          </header>

          <section className="prose max-w-none text-neutral-800">
            <p>
              Bem-vindo à Look. Estes Termos de Uso regem o acesso e
              uso da plataforma Look Marketplace, nomeadamente do aplicativo e
              site Look. Ao usar a plataforma você concorda com estes Termos.
            </p>

            <h2>1. O que é a Look</h2>
            <p>
              A Look Marketplace é uma plataforma intermediadora que conecta
              clientes e marcas parceiras. As vendas são realizadas entre o
              cliente e a marca parceira. A Look presta o serviço de
              intermediação, processamento do pedido, repasse de pagamento e
              entrega ultrarrápida.
            </p>

            <h2>2. Identificação</h2>
            <p>
              Nome empresarial: <strong>Look Mktplace</strong> . Contato para dúvidas:{"+55 11 966111233"}
              <em>team@wearalook.com</em> .
            </p>

            <h2>3. Conta e cadastro</h2>
            <p>
              Para comprar na Look você deve fornecer informações verdadeiras e
              completas. É proibido compartilhar contas. Você é responsável por
              manter a segurança da sua conta e notificar a Look em caso de uso
              não autorizado.
            </p>

            <h2>4. Pedidos, pagamento e repasses</h2>
            <ol>
              <li>
                O pagamento é realizado dentro do aplicativo. Atualmente o
                método disponível é Pix.
              </li>
              <li>
                A Look retém uma comissão de serviço de 10% sobre o valor do
                pedido.
              </li>
              <li>
                Há ainda uma taxa de operação fixa de R$ 3,40 por pedido, além
                do valor do frete cobrado pelo parceiro lojista.
              </li>
              <li>
                A Look faz o repasse do valor ao lojista conforme políticas
                internas e contratos com parceiros. Valores retidos a título de
                comissão e taxa de operação não são reembolsáveis pela Look
                quando o usuário optar por devolver o produto.
              </li>
            </ol>

            <h2>5. Frete, entregas e responsabilidade</h2>
            <ol>
              <li>
                A Look é responsável pela organização logística da entrega
                conforme oferta do serviço. O prazo informado no app é estimado.
              </li>
              <li>
                A Look não se responsabiliza por atrasos imputáveis às marcas,
                ao entregador ou a eventos de força maior.
              </li>
              <li>
                Em caso de problema com a entrega, entre em contato com a Look
                pelo canal de suporte. A Look atua como mediadora entre cliente
                e marca parceira.
              </li>
            </ol>

            <h2>6. Trocas, devoluções e reembolsos</h2>
            <ol>
              <li>
                A política de troca e devolução do produto é da própria loja
                parceira.
              </li>
              <li>
                Quando o cliente solicitar devolução ou troca, a Look intermedia
                o contato entre cliente e marca. O reembolso do valor do produto
                é de responsabilidade da marca parceira.
              </li>
              <li>
                A taxa de entrega e a taxa de operação da Look não são
                reembolsáveis quando a devolução é feita por decisão do cliente,
                salvo quando houver erro ou defeito comprovado no produto.
              </li>
            </ol>

            <h2>7. Produtos com defeito ou divergentes</h2>
            <p>
              Produtos com defeito ou que não correspondem ao anúncio devem ser
              reclamados junto à Look. A Look mediará a reclamação com a marca.
              A marca é responsável por reembolsar ou trocar o produto, quando
              aplicável.
            </p>

            <h2>8. Suporte e mediação</h2>
            <p>
              A Look oferece suporte e mediação de disputas entre clientes e
              marcas. A Look tentará resolver conflitos de boa-fé, mas não
              garante resultado específico em disputas entre as partes.
            </p>

            <h2>9. Conteúdo e propriedade intelectual</h2>
            <p>
              Todo conteúdo disponibilizado pela Look é protegido por direitos
              autorais. Você concorda em não reproduzir, distribuir ou criar
              obras derivadas sem autorização.
            </p>

            <h2>10. Limitação de responsabilidade</h2>
            <p>
              Na máxima extensão permitida pela lei, a Look não será responsável
              por danos indiretos, lucros cessantes, perda de dados ou qualquer
              consequência resultante do uso da plataforma, defeitos ou vícios
              dos produtos vendidos por marcas parceiras, ou atrasos decorrentes
              de problemas logísticos fora do controle da Look.
            </p>

            <h2>11. Atualizações dos Termos</h2>
            <p>
              A Look pode alterar estes Termos a qualquer momento. Mudanças
              relevantes serão comunicadas no app ou por e-mail. O uso contínuo
              após a alteração constitui aceitação.
            </p>

            <h2>12. Lei aplicável e foro</h2>
            <p>
              Estes Termos são regidos pela legislação brasileira. Fica eleito o
              foro da Comarca de São Paulo, estado de São Paulo, para solução de
              conflitos, salvo disposição legal em contrário.
            </p>

            <h2>13. Contato</h2>
            <p>
              Para dúvidas e solicitações: <em>team@wearalook.com</em>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
