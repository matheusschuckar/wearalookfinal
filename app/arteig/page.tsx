"use client";

import React, { CSSProperties } from "react";
import Head from "next/head";

export default function IGArtGeneratorPage() {
  const iPhoneMockupUrl =
    "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png";

  return (
    <>
      <Head>
        <title>Look Art Studio // 1.0 REMIX</title>
      </Head>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatArtAnimation {
          0% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
          100% { transform: translateY(0px) rotate(-5deg); }
        }
      `}} />

      <main style={pageStyles.wrapper}>
        <div style={pageStyles.controls}>
          <h2 style={{ fontSize: "12px", fontVariantCaps: "all-small-caps", fontWeight: "bold", letterSpacing: "1px", margin: 0 }}>
            Look Editorial Art Generator // v1 Remix
          </h2>
          <p style={{ fontSize: "11px", color: "#888", marginTop: "8px", marginBottom: 0 }}>
            Inspecione o elemento <b>#look-art-canvas</b> e clique em <i>Capture node screenshot</i> para exportar em 1080x1350.
          </p>
        </div>

        {/* 🔥 O CANVAS DA ARTE: Exatamente 1080 x 1350 */}
        <div id="look-art-canvas" style={artStyles.canvas}>
          
          {/* HEADER DA ARTE */}
          <header style={artStyles.header}>
            <span style={artStyles.logo}>Look</span>
            <span style={artStyles.version}>SYSTEM UPDATE // 2.0</span>
          </header>

          {/* LINHA SECA BRUTALISTA */}
          <div style={artStyles.divider} />

          <div style={artStyles.content}>
            {/* TEXTOS GIGANTES (Ajustados para não sobrepor a tela do celular) */}
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

              {/* CAIXA DE "AVAILABLE NOW" */}
              <div style={artStyles.actionBox}>
                <span style={artStyles.actionText}>AVAILABLE NOW</span>
                <span style={artStyles.actionSub}>APP STORE</span>
              </div>
            </div>

            {/* MOCKUP DO IPHONE GIGANTE VAZANDO A TELA (Recuado para baixo) */}
            <div style={artStyles.imageWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={iPhoneMockupUrl} 
                alt="Look App Layout" 
                style={artStyles.mockup}
              />
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
    </>
  );
}

// ======================================================
// MARK: - STYLES DO AMBIENTE DEV
// ======================================================
const pageStyles: Record<string, CSSProperties> = {
  wrapper: {
    backgroundColor: "#111",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
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
  canvas: {
    width: "1080px",
    height: "1350px",
    backgroundColor: "#F6F3ED",
    position: "relative",
    overflow: "hidden",
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
    zIndex: 10,
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
    zIndex: 10,
  },
  content: {
    flex: 1,
    position: "relative",
    padding: "80px",
    display: "flex",
    flexDirection: "row",
  },
  textCol: {
    zIndex: 10, // Garante que o texto fique por cima do celular caso haja um toque milimétrico
    display: "flex",
    flexDirection: "column",
    marginTop: "20px", // Subiu um pouquinho para distanciar do celular
    width: "650px", // Largura controlada
  },
  kicker: {
    fontSize: "24px",
    fontWeight: 800,
    letterSpacing: "8px",
    color: "rgba(0,0,0,0.5)",
    marginBottom: "30px",
  },
  title: {
    fontSize: "120px", // 🔥 Ajustado para caber perfeitamente sem invadir o iPhone
    fontWeight: 800,
    letterSpacing: "-6px",
    lineHeight: 0.9,
    color: "#000",
    margin: "0 0 40px 0",
  },
  subtitle: {
    fontSize: "30px", // 🔥 Levemente menor para alinhar com o título
    fontWeight: 600,
    color: "rgba(0,0,0,0.7)",
    letterSpacing: "1px",
    lineHeight: 1.4,
    margin: "0 0 60px 0", // Margem inferior ajustada
  },
  actionBox: {
    backgroundColor: "#000",
    padding: "30px 40px",
    display: "inline-flex",
    flexDirection: "column",
    width: "fit-content",
    border: "none",
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
    right: "-60px", 
    bottom: "-250px", // 🔥 Recuado bem mais para baixo para não engolir o texto
    zIndex: 5,
  },
  mockup: {
    height: "1150px", // Levemente menor que a versão original
    width: "auto",
    position: "relative",
    zIndex: 2,
    transform: "rotate(-5deg)",
  },
  mockupShadow: {
    position: "absolute",
    bottom: "250px",
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
    zIndex: 10,
  }
};
