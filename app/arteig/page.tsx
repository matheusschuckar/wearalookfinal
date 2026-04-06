"use client";

import React, { CSSProperties } from "react";
import Head from "next/head";

export default function IGArtGeneratorPage() {
  const iPhoneMockupUrl =
    "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png";

  return (
    <>
      <Head>
        <title>Look Art Studio // NEW DESIGN</title>
      </Head>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatArtAnimation {
          0% { transform: translateY(0px) rotate(-4deg); }
          50% { transform: translateY(-18px) rotate(-4deg); }
          100% { transform: translateY(0px) rotate(-4deg); }
        }
      `}} />

      <main style={pageStyles.wrapper}>
        <div style={pageStyles.controls}>
          <h2 style={{ fontSize: "12px", fontVariantCaps: "all-small-caps", fontWeight: "bold", letterSpacing: "1px" }}>
            Look Editorial Art Generator
          </h2>
        </div>

        <div id="look-art-canvas" style={artStyles.canvas}>
          
          <section style={artStyles.heroTextSection}>
            <h1 style={artStyles.heroTitle}>
              READY<br />
              TO WEAR<br />
              IN MINUTES.
            </h1>
          </section>

          <div style={artStyles.divider} />

          <section style={artStyles.dossierSection}>
            
            <div style={artStyles.textDossier}>
              <header style={artStyles.dossierHeader}>
                <span style={artStyles.logo}>LOOK</span>
                <span style={artStyles.versionLabel}>NOVO DESIGN</span>
              </header>

              <div style={artStyles.block}>
                <span style={artStyles.kicker}>REDESENHAMOS A EXPERIÊNCIA</span>
                <p style={artStyles.subtitle}>
                  UM NOVO DESIGN,<br />
                  MAIS RÁPIDO, MAIS INTUITIVO.<br />
                  ENCONTRE, ESCOLHA E RECEBA<br />
                  EM MINUTOS.
                </p>
              </div>

              <div style={artStyles.button}>
                BAIXAR O APP
              </div>
            </div>

            <div style={artStyles.mockupWrapper}>
              <img 
                src={iPhoneMockupUrl} 
                alt="Look App Novo Design" 
                style={artStyles.mockup}
              />
              <div style={artStyles.mockupShadow} />
            </div>
          </section>

          <footer style={artStyles.artFooter}>
            <span>WEARALOOK.COM</span>
            <span>NOVO DESIGN // 2026</span>
          </footer>

        </div>
      </main>
    </>
  );
}

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
    padding: "12px 20px",
    marginBottom: "40px",
    textAlign: "center",
    border: "2px solid #000",
  }
};

const artStyles: Record<string, CSSProperties> = {
  canvas: {
    width: "1080px",
    height: "1350px",
    backgroundColor: "#F6F3ED",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  heroTextSection: {
    padding: "100px 90px 50px 90px",
  },
  heroTitle: {
    fontSize: "120px",
    fontWeight: 900,
    letterSpacing: "-7px",
    lineHeight: "0.88",
    color: "#000",
    textTransform: "uppercase",
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
  },
  textDossier: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    maxWidth: "520px",
    gap: "60px",
  },
  dossierHeader: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  logo: {
    fontSize: "34px",
    fontWeight: 900,
    letterSpacing: "-2px",
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
    gap: "16px",
  },
  kicker: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#999",
  },
  subtitle: {
    fontSize: "28px",
    fontWeight: 600,
    color: "rgba(0,0,0,0.85)",
    lineHeight: "1.35",
    margin: 0,
  },
  button: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "18px 26px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "2px",
    textTransform: "uppercase",
    width: "fit-content",
  },
  mockupWrapper: {
    position: "absolute",
    right: "-100px",
    bottom: "-180px",
    animation: "floatArtAnimation 6s ease-in-out infinite",
  },
  mockup: {
    height: "1100px",
    transform: "rotate(-4deg)",
  },
  mockupShadow: {
    position: "absolute",
    bottom: "200px",
    left: "150px",
    width: "350px",
    height: "40px",
    backgroundColor: "rgba(0,0,0,0.25)",
    filter: "blur(30px)",
    transform: "rotate(-4deg)",
  },
  artFooter: {
    display: "flex",
    justifyContent: "space-between",
    padding: "40px 90px",
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "rgba(0,0,0,0.35)",
    borderTop: "1px solid rgba(0,0,0,0.05)",
  }
};
