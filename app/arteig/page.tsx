"use client";

import React, { CSSProperties } from "react";
import Head from "next/head";

export default function IGArtGeneratorPage() {
  const iPhoneMockupUrl =
    "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png";

  return (
    <>
      <Head>
        <title>Look Art Studio // 2.0 UPDATE</title>
      </Head>
      
      {/* CSS Seguro para o Next.js exportar */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatArtAnimation {
          0% { transform: translateY(0px) rotate(-6deg); }
          50% { transform: translateY(-15px) rotate(-6deg); }
          100% { transform: translateY(0px) rotate(-6deg); }
        }
      `}} />

      <main style={pageStyles.wrapper}>
        <div style={pageStyles.controls}>
          <h2 style={{ fontSize: "12px", fontVariantCaps: "all-small-caps", fontWeight: "bold", letterSpacing: "1px" }}>
            Look Editorial Art Generator // 2.0
          </h2>
          <p style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            Inspecione o elemento <b>#look-art-canvas</b> e clique em <i>Capture node screenshot</i> para exportar.
          </p>
        </div>

        {/* 🔥 CANVAS DA ARTE: Exatamente 1080 x 1350 */}
        <div id="look-art-canvas" style={artStyles.canvas}>
          
          {/* SEÇÃO 1: Manchete Monumental */}
          <section style={artStyles.heroTextSection}>
            <h1 style={artStyles.heroTitle}>
              THE<br />
              NEW<br />
              STANDARD.
            </h1>
          </section>

          {/* LINHA SECA BRUTALISTA DE DIVISÃO */}
          <div style={artStyles.divider} />

          {/* SEÇÃO 2: Dossiê e Imagem (Hierarquia Total) */}
          <section style={artStyles.dossierSection}>
            
            {/* TEXTOS TÉCNICOS (Seguros à Esquerda) */}
            <div style={artStyles.textDossier}>
              <header style={artStyles.dossierHeader}>
                <span style={artStyles.logo}>Look</span>
                <span style={artStyles.versionLabel}>SYSTEM UPDATE // 2.0</span>
              </header>

              <div style={artStyles.block}>
                <span style={artStyles.kicker}>MODA EM MINUTOS</span>
                <p style={artStyles.subtitle}>
                  REDESENHADO PARA O LUXO.<br />
                  CURADORIA EDITORIAL E<br />
                  INTELIGÊNCIA DE MODA,<br />
                  INSTANTÂNEA.
                </p>
              </div>

              {/* Botão Brutalista de Ação */}
              <div style={artStyles.button}>
                Abrir na App Store →
              </div>
            </div>

            {/* O IPHONE GIGANTE NA BASE DIREITA (Sem tocar no texto) */}
            <div style={artStyles.mockupWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={iPhoneMockupUrl} 
                alt="Look App Layout 2.0" 
                style={artStyles.mockup}
              />
              <div style={artStyles.mockupShadow} />
            </div>
          </section>

          {/* FOOTER DA ARTE */}
          <footer style={artStyles.artFooter}>
            <span>WEARALOOK.COM</span>
            <span>©2026 // SÃO PAULO, BR</span>
          </footer>

        </div>
      </main>
    </>
  );
}

// ======================================================
// MARK: - STYLES DO AMBIENTE DEV (Página de Rota)
// ======================================================
const pageStyles: Record<string, CSSProperties> = {
  wrapper: {
    backgroundColor: "#111", // Fundo escuro para a página de dev
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px",
    fontFamily: "-apple-system, sans-serif",
  },
  controls: {
    backgroundColor: "#FFF",
    padding: "12px 20px",
    marginBottom: "40px",
    textAlign: "center",
    border: "2px solid #000",
  }
};

// ======================================================
// MARK: - STYLES DA ARTE 1080x1350 (BRUTALISMO HIERÁRQUICO)
// ======================================================
const artStyles: Record<string, CSSProperties> = {
  canvas: {
    width: "1080px",
    height: "1350px",
    backgroundColor: "#F6F3ED", // O nosso bege de luxo
    position: "relative",
    overflow: "hidden", // Corta o iPhone vando pelas bordas inferior/direita
    display: "flex",
    flexDirection: "column",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    boxSizing: "border-box",
  },
  heroTextSection: {
    padding: "90px 90px 40px 90px",
  },
  heroTitle: {
    fontSize: "110px",
    fontWeight: 800,
    letterSpacing: "-6px",
    lineHeight: "0.9",
    color: "#000",
    textTransform: "uppercase", // Manchete editorial colossal
    margin: 0,
  },
  divider: {
    height: "1px",
    backgroundColor: "#000",
    margin: "0 90px",
  },
  dossierSection: {
    flex: 1,
    position: "relative",
    padding: "60px 90px",
    display: "flex",
    flexDirection: "row", // Grid simulado
  },
  textDossier: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    maxWidth: "520px", // Garante que o texto nunca sobreponha o celular
    gap: "50px",
    marginTop: "20px",
  },
  dossierHeader: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  logo: {
    fontSize: "32px",
    fontWeight: 900,
    letterSpacing: "-2px",
    textTransform: "uppercase",
    color: "#000",
  },
  versionLabel: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "rgba(0,0,0,0.4)",
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  kicker: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#888",
  },
  subtitle: {
    fontSize: "26px",
    fontWeight: 600,
    color: "rgba(0,0,0,0.8)",
    lineHeight: "1.4",
    margin: 0,
  },
  button: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "16px 24px",
    textDecoration: "none",
    borderRadius: "0px", // Brutalista
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  mockupWrapper: {
    position: "absolute",
    right: "-120px", // Vaza propositalmente para a direita
    bottom: "-200px", // Vaza propositalmente para baixo
    zIndex: 1, // Fica atrás do texto se por acaso tocar (mas não tocará)
  },
  mockup: {
    height: "1100px", // Mockup GIGANTE na base
    width: "auto",
    position: "relative",
    zIndex: 2,
    transform: "rotate(-6deg)", // Inclinação agressiva editorial
    // filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.15))", 
  },
  mockupShadow: {
    position: "absolute",
    bottom: "200px",
    left: "150px",
    width: "350px",
    height: "40px",
    backgroundColor: "rgba(0,0,0,0.3)",
    filter: "blur(30px)",
    transform: "rotate(-6deg)",
    zIndex: 1,
  },
  artFooter: {
    display: "flex",
    justifyContent: "space-between",
    padding: "40px 90px",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "rgba(0,0,0,0.3)",
    borderTop: "1px solid rgba(0,0,0,0.05)",
  }
};              THE NEW<br />
              STANDARD.
            </h1>
            
            <p style={artStyles.subtitle}>
              REDESENHADO PARA O LUXO.<br />
              CURADORIA EDITORIAL E INTELIGÊNCIA<br />
              DE MODA NA PALMA DA SUA MÃO.
            </p>

            {/* CAIXA DE "UPDATE NOW" */}
            <div style={artStyles.actionBox}>
              <span style={artStyles.actionText}>AVAILABLE NOW</span>
              <span style={artStyles.actionSub}>APP STORE</span>
            </div>
          </div>

          {/* MOCKUP DO IPHONE GIGANTE VAZANDO A TELA */}
          <div style={artStyles.imageWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={iPhoneMockupUrl} 
              alt="Look App Layout" 
              style={artStyles.mockup}
            />
            {/* Sombra dramática brutalista */}
            <div style={artStyles.mockupShadow} />
          </div>
        </div>

        {/* FOOTER DA ARTE */}
        <div style={artStyles.artFooter}>
          <span>WEARALOOK.COM</span>
          <span>©2026 // SÃO PAULO, BR</span>
        </div>

      </div>
    </main>
  );
}

// ======================================================
// MARK: - STYLES DO AMBIENTE DEV
// ======================================================
const pageStyles: Record<string, CSSProperties> = {
  wrapper: {
    backgroundColor: "#111", // Fundo escuro para a página de dev
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px",
    fontFamily: "-apple-system, sans-serif",
  },
  controls: {
    backgroundColor: "#FFF",
    padding: "16px 24px",
    marginBottom: "40px",
    textAlign: "center",
    border: "2px solid #000",
  }
};

// ======================================================
// MARK: - STYLES DA ARTE 1080x1350 (BRUTALISMO EDITORIAL)
// ======================================================
const artStyles: Record<string, CSSProperties> = {
  board: {
    width: "1080px",
    height: "1350px",
    backgroundColor: "#F6F3ED", // O nosso bege de luxo
    position: "relative",
    overflow: "hidden", // Corta a imagem do iPhone que vazar
    display: "flex",
    flexDirection: "column",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "60px 80px 30px 80px",
  },
  logo: {
    fontSize: "64px",
    fontWeight: 900,
    letterSpacing: "-3px",
    textTransform: "uppercase",
    color: "#000",
    lineHeight: 0.8,
  },
  version: {
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "4px",
    color: "rgba(0,0,0,0.4)",
  },
  divider: {
    height: "2px",
    backgroundColor: "#000",
    margin: "0 80px",
  },
  content: {
    flex: 1,
    position: "relative",
    padding: "80px",
    display: "flex",
    flexDirection: "row",
  },
  textCol: {
    zIndex: 10, // Fica por cima do celular se sobrepor
    display: "flex",
    flexDirection: "column",
    marginTop: "40px",
    width: "700px",
  },
  kicker: {
    fontSize: "24px",
    fontWeight: 800,
    letterSpacing: "8px",
    color: "rgba(0,0,0,0.5)",
    marginBottom: "30px",
  },
  title: {
    fontSize: "140px",
    fontWeight: 800,
    letterSpacing: "-6px",
    lineHeight: 0.9,
    color: "#000",
    margin: "0 0 40px 0",
  },
  subtitle: {
    fontSize: "32px",
    fontWeight: 600,
    color: "rgba(0,0,0,0.7)",
    letterSpacing: "1px",
    lineHeight: 1.4,
    margin: "0 0 80px 0",
  },
  actionBox: {
    backgroundColor: "#000",
    padding: "30px 40px",
    display: "inline-flex",
    flexDirection: "column",
    width: "fit-content",
    border: "none", // Zero bordas arredondadas
  },
  actionText: {
    color: "#FFF",
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "2px",
  },
  actionSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "16px",
    fontWeight: 600,
    letterSpacing: "4px",
    marginTop: "4px",
  },
  imageWrapper: {
    position: "absolute",
    right: "-80px", // Vaza propositalmente para a direita
    bottom: "-150px", // Vaza propositalmente para baixo
    zIndex: 5,
  },
  mockup: {
    height: "1200px", // Mockup GIGANTE
    width: "auto",
    position: "relative",
    zIndex: 2,
    transform: "rotate(-5deg)", // Leve inclinação dinâmica editorial
  },
  mockupShadow: {
    position: "absolute",
    bottom: "150px",
    left: "100px",
    width: "400px",
    height: "50px",
    backgroundColor: "rgba(0,0,0,0.3)",
    filter: "blur(30px)",
    transform: "rotate(-5deg)",
    zIndex: 1,
  },
  artFooter: {
    display: "flex",
    justifyContent: "space-between",
    padding: "40px 80px",
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "rgba(0,0,0,0.3)",
  }
};
