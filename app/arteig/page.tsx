"use client";

import React, { CSSProperties } from "react";

export default function IGArtGeneratorPage() {
  const iPhoneMockupUrl =
    "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png";

  return (
    <main style={pageStyles.wrapper}>
      <div style={pageStyles.controls}>
        <h2 style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
          Look IG Art Generator
        </h2>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          Inspecione o elemento <b>#ig-art-board</b> e clique em <i>Capture node screenshot</i> para exportar em 1080x1350.
        </p>
      </div>

      {/* 🔥 O CANVAS DA ARTE: Exatamente 1080 x 1350 */}
      <div id="ig-art-board" style={artStyles.board}>
        
        {/* HEADER DA ARTE */}
        <header style={artStyles.header}>
          <span style={artStyles.logo}>Look</span>
          <span style={artStyles.version}>SYSTEM UPDATE // 2.0</span>
        </header>

        {/* LINHA SECA BRUTALISTA */}
        <div style={artStyles.divider} />

        <div style={artStyles.content}>
          {/* TEXTOS GIGANTES */}
          <div style={artStyles.textCol}>
            <span style={artStyles.kicker}>THE FASHION VAULT</span>
            <h1 style={artStyles.title}>
              THE NEW<br />
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
