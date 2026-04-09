"use client";

import React, { CSSProperties } from "react";
import Head from "next/head";

export default function LookPartnersSlide2() {
  const mockupUrl = "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/store_images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story-3.png";

  return (
    <>
      <Head>
        <title>Look Partners // ASSET CONTROL</title>
      </Head>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatArtAnimation {
          0% { transform: translateY(0px) rotate(-4deg); }
          50% { transform: translateY(-18px) rotate(-4deg); }
          100% { transform: translateY(0px) rotate(-4deg); }
        }
      `}} />

      <main style={pageStyles.wrapper}>
        <div id="look-art-canvas-2" style={artStyles.canvas}>
          <section style={artStyles.heroTextSection}>
            <h1 style={artStyles.heroTitle}>
              TOTAL<br />
              ASSET<br />
              CONTROL.
            </h1>
          </section>

          <div style={artStyles.divider} />

          <section style={artStyles.dossierSection}>
            <div style={artStyles.textDossier}>
              <header style={artStyles.dossierHeader}>
                <span style={artStyles.logo}>CATÁLOGO</span>
              </header>

              <div style={artStyles.block}>
                <p style={artStyles.subtitle}>
                  GESTÃO DE<br />
                  ACERVO EM<br />
                  TEMPO REAL.
                </p>
                <p style={artStyles.support}>
                  ADICIONE E EDITE SUAS<br/>PEÇAS COM PRECISÃO.
                </p>
              </div>
            </div>

            <div style={artStyles.mockupWrapper}>
              <img src={mockupUrl} alt="Adicionar Produto" style={artStyles.mockup} />
              <div style={artStyles.mockupShadow} />
            </div>
          </section>

          <footer style={artStyles.artFooter}>
            <span>WEARALOOK.COM/PARTNERS</span>
            <span>02/05</span>
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
    zIndex: 20,
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
    zIndex: 10,
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
    zIndex: 20,
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
  mockupWrapper: {
    position: "absolute",
    right: "-80px",
    bottom: "-200px",
    zIndex: 30, // Maior que o zIndex do rodapé para ficar à frente da linha
  },
  mockup: {
    height: "1000px",
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
    justifyContent: "flex-start", // Retorna o texto para o lado esquerdo
    padding: "40px 80px",
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "4px",
    color: "rgba(0,0,0,0.35)",
    borderTop: "2px solid rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 10, // Menor que o zIndex do mockupWrapper (30) para a linha ficar atrás
  }
};
