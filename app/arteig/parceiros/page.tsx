"use client";

import React, { CSSProperties } from "react";
import Head from "next/head";

export default function LookPartnersSlide5() {
  return (
    <>
      <Head>
        <title>Look Partners // ELEVATE</title>
      </Head>

      <main style={pageStyles.wrapper}>
        <div id="look-art-canvas-5" style={artStyles.canvas}>
          
          <section style={{...artStyles.heroTextSection, paddingBottom: "0"}}>
            <h1 style={{...artStyles.heroTitle, fontSize: "125px", textAlign: "center"}}>
              ELEVATE<br />
              YOUR<br />
              CURATION.
            </h1>
          </section>

          <div style={{...artStyles.divider, margin: "60px 80px"}} />

          <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", textAlign: "center" }}>
            
            <span style={artStyles.logo}>LOOK PARTNERS</span>
            
            <p style={{...artStyles.subtitle, marginTop: "40px", marginBottom: "20px"}}>
              MUITO MAIS AGUARDA<br />NOS BASTIDORES.
            </p>
            
            <p style={{...artStyles.support, maxWidth: "700px", marginBottom: "60px"}}>
              ELEVE O PADRÃO DA SUA OPERAÇÃO. ENTRE EM CONTATO E TRAGA SUA MARCA PARA O ECOSSISTEMA LOOK.
            </p>

            <div style={artStyles.button}>
              APPLY NOW
            </div>

          </section>

          <footer style={artStyles.artFooter}>
            <span>WEARALOOK.COM/PARTNERS</span>
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
    cursor: "pointer",
  },
  artFooter: {
    display: "flex",
    justifyContent: "flex-start",
    padding: "40px 80px",
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "4px",
    color: "rgba(0,0,0,0.35)",
    borderTop: "2px solid rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 10,
  }
};
