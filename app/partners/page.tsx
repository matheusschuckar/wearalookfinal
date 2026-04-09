"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import Head from "next/head";

export default function OpenPartnersAppPage() {
  // ATENÇÃO: Substitua pelo link correto do App LookPartners na App Store
  const appStoreUrl =
    "https://apps.apple.com/br/app/look-partners/idXXXXXXXXX";

  // Mockup 1 (Abertura/Dashboard)
  const iPhoneMockupUrl =
    "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/store_images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story-2.png";

  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    setDomReady(true);

    // Detecção de In-App Browsers (Instagram, Facebook, etc.)
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isSocialWebView = /Instagram|FBAV|FBAN|TikTok|Twitter/i.test(ua);

    // Se NÃO for rede social, tenta abrir o app automaticamente "lookpartners://"
    // Isso evita a tela cinza de crash no navegador do Instagram.
    if (!isSocialWebView) {
      const start = Date.now();

      setTimeout(() => {
        // Ajuste aqui se o deep link do app partners for diferente
        window.location.href = "lookpartners://";
      }, 300);

      const timer = setTimeout(() => {
        const elapsed = Date.now() - start;
        if (elapsed < 2000) {
          window.location.href = appStoreUrl;
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [appStoreUrl]);

  return (
    <>
      <Head>
        <title>Look Partners | Elevate Your Curation</title>
        <meta name="theme-color" content="#F6F3ED" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Head>

      {/* CSS Embutido e Protegido para o Next.js (SSR) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body {
              margin: 0;
              background-color: #F6F3ED;
              overflow-x: hidden;
            }

            @keyframes floatAnimation {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
              100% { transform: translateY(0px); }
            }

            .grid {
              flex: 1;
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 40px;
              align-items: center;
              max-width: 1300px;
              margin: 0 auto;
              padding: 60px 40px;
            }

            @media (max-width: 900px) {
              .grid {
                grid-template-columns: 1fr;
                text-align: center;
                padding: 40px 20px;
              }
              
              /* Força os blocos a centralizarem no mobile */
              .text-column-mobile {
                align-items: center !important;
              }
              .cta-box-mobile {
                align-items: center !important;
              }
              .title-mobile {
                font-size: 38px !important;
              }
            }
          `,
        }}
      />

      <main style={{ ...styles.main, opacity: domReady ? 1 : 0 }}>
        
        <header style={styles.header}>
          <Text size={20} weight={900} upper>
            Look Partners
          </Text>
        </header>

        <div className="grid">
          {/* TEXT COLUMN */}
          <div style={styles.textColumn} className="text-column-mobile">
            <div style={styles.block}>
              <Text size={12} weight={800} color="#888" upper>
                O BASTIDOR DA SUA MARCA
              </Text>

              <h1 style={styles.title} className="title-mobile">
                A sua galeria.
                <br />
                O seu controle.
              </h1>

              <p style={styles.subtitle}>
                O app exclusivo para as marcas do ecossistema Look. Gestão de acervo em tempo real, curadoria impecável e controle absoluto da sua operação.
              </p>
            </div>

            <div style={styles.ctaBox} className="cta-box-mobile">
              <Text size={13} weight={600} color="#666">
                Não abriu automaticamente?
              </Text>

              <a href={appStoreUrl} style={styles.button}>
                Abrir na App Store →
              </a>
            </div>
          </div>

          {/* IMAGE COLUMN */}
          <div style={styles.imageColumn}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iPhoneMockupUrl}
              alt="Look Partners App"
              style={styles.image}
            />
          </div>
        </div>

        <footer style={styles.footer}>
          <Text size={11} color="#AAA" weight={600} upper>
            © LOOK PARTNERS
          </Text>
        </footer>
      </main>
    </>
  );
}

// ======================================================
// MARK: - COMPONENTS
// ======================================================

interface TextProps {
  size: number | string;
  weight?: number;
  color?: string;
  upper?: boolean;
  children: React.ReactNode;
}

const Text: React.FC<TextProps> = ({
  size,
  weight,
  color,
  upper,
  children,
}) => (
  <span
    style={{
      fontSize: size,
      fontWeight: weight || 400,
      color: color || "#000",
      textTransform: upper ? "uppercase" : "none",
      lineHeight: 1.4,
      letterSpacing: upper ? "1px" : "normal",
    }}
  >
    {children}
  </span>
);

// ======================================================
// MARK: - STYLES
// ======================================================

const styles: Record<string, CSSProperties> = {
  main: {
    backgroundColor: "#F6F3ED",
    minHeight: "100vh",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: "flex",
    flexDirection: "column",
    transition: "opacity 0.6s",
  },
  header: {
    padding: "24px 40px",
    borderBottom: "2px solid rgba(0,0,0,0.05)",
  },
  textColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "40px",
    alignItems: "flex-start", // Garante alinhamento à esquerda no desktop
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  title: {
    fontSize: "48px",
    fontWeight: 800,
    lineHeight: 1.05,
    margin: 0,
    letterSpacing: "-1px",
    color: "#000",
  },
  subtitle: {
    fontSize: "16px",
    color: "rgba(0,0,0,0.7)",
    maxWidth: "420px",
    margin: 0,
    lineHeight: 1.5,
  },
  ctaBox: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "flex-start",
  },
  button: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "16px 24px",
    textDecoration: "none",
    borderRadius: "0px", // Brutalista
    display: "inline-block",
    width: "fit-content",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontSize: "13px"
  },
  imageColumn: {
    display: "flex",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    maxWidth: "340px",
    animation: "floatAnimation 6s ease-in-out infinite", // Animação mantida!
  },
  footer: {
    padding: "20px 40px",
    textAlign: "center",
    borderTop: "2px solid rgba(0,0,0,0.05)",
    marginTop: "auto",
  },
};
