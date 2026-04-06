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
            Look Editorial Art Generator // Mobile Optimized
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
              </header>

              <div style={artStyles.block}>
                <p style={artStyles.subtitle}>
                  UM NOVO DESIGN.<br />
                  MAIS RÁPIDO.<br />
                  MAIS INTUITIVO.
                </p>

                <p style={artStyles.support}>
                  ENCONTRE, ESCOLHA E<br/> RECEBA EM MINUTOS.
                </p>
              </div>

              <div style={artStyles.button}>
                ATUALIZE O APP
              </div>

            </div>

            <div style={artStyles.mockupWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            <span>© 2026 // SÃO PAULO, BR</span>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  heroTextSection: {
    padding: "90px 80px 40px 80px",
    position: "relative",
    zIndex: 20, // Título fica em cima de tudo
  },
  heroTitle: {
    fontSize: "145px", 
    fontWeight: 900,
    letterSpacing: "-8px", 
    lineHeight: "0.85", 
    color: "#000",
    textTransform: "uppercase",
    margin: 0,
  },
  divider: {
    height: "2px", 
    backgroundColor: "#000",
    margin: "0 80px",
    position: "relative",
    zIndex: 10, // A linha fica por baixo do celular (que tem zIndex 15)
  },
  dossierSection: {
    flex: 1,
    position: "relative",
    padding: "60px 80px",
    display: "flex",
  },
  textDossier: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    maxWidth: "580px", 
    gap: "50px",
    position: "relative",
    zIndex: 20, // O texto de apoio e o botão ficam por cima do celular
  },
  dossierHeader: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  logo: {
    fontSize: "48px", 
    fontWeight: 900,
    letterSpacing: "-2px",
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  subtitle: {
    fontSize: "48px", 
    fontWeight: 800,
    color: "#000",
    lineHeight: "1.1",
    letterSpacing: "-1px",
    margin: 0,
  },
  support: {
    fontSize: "30px", 
    fontWeight: 600,
    color: "rgba(0,0,0,0.6)",
    lineHeight: "1.3",
    margin: 0,
  },
  button: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "24px 40px", 
    fontSize: "24px", 
    fontWeight: 900,
    letterSpacing: "3px",
    textTransform: "uppercase",
    width: "fit-content",
    marginTop: "10px",
  },
  mockupWrapper: {
    position: "absolute",
    right: "-120px", 
    bottom: "-220px", 
    animation: "floatArtAnimation 6s ease-in-out infinite",
    zIndex: 15, // Celular por cima da linha (10), mas embaixo do texto (20)
  },
  mockup: {
    height: "1150px", 
    transform: "rotate(-4deg)",
  },
  mockupShadow: {
    position: "absolute",
    bottom: "220px",
    left: "150px",
    width: "350px",
    height: "50px",
    backgroundColor: "rgba(0,0,0,0.3)",
    filter: "blur(40px)",
    transform: "rotate(-4deg)",
    zIndex: -1,
  },
  artFooter: {
    display: "flex",
    justifyContent: "space-between",
    padding: "40px 80px",
    fontSize: "22px", 
    fontWeight: 800,
    letterSpacing: "4px",
    color: "rgba(0,0,0,0.35)",
    borderTop: "2px solid rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 20, // Garante que o footer não seja engolido pela sombra
  }
};
