"use client";

import React, { CSSProperties } from "react";
import Head from "next/head";

export default function LookPartnersSlide3() {
  const mockupUrl = "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/store_images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story-6.png";

  return (
    <>
      <Head>
        <title>Look Partners // BRAND UNIVERSE</title>
      </Head>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatArtAnimation {
          0% { transform: translateY(0px) rotate(-4deg); }
          50% { transform: translateY(-18px) rotate(-4deg); }
          100% { transform: translateY(0px) rotate(-4deg); }
        }
      `}} />

      <main style={pageStyles.wrapper}>
        <div id="look-art-canvas-3" style={artStyles.canvas}>
          <section style={artStyles.heroTextSection}>
            <h1 style={artStyles.heroTitle}>
              YOUR<br />
              BRAND<br />
              UNIVERSE.
            </h1>
          </section>

          <div style={artStyles.divider} />

          <section style={artStyles.dossierSection}>
            <div style={artStyles.textDossier}>
              <header style={artStyles.dossierHeader}>
                <span style={artStyles.logo}>IDENTIDADE</span>
              </header>

              <div style={artStyles.block}>
                <p style={artStyles.subtitle}>
                  A SUA GALERIA.<br />
                  A SUA VISÃO.<br />
                  O SEU ESPAÇO.
                </p>
                <p style={artStyles.support}>
                  PERSONALIZE A ATMOSFERA<br/>DA SUA LOJA NA LOOK.
                </p>
              </div>
            </div>

            <div style={artStyles.mockupWrapper}>
              <img src={mockupUrl} alt="Personalizar Loja" style={artStyles.mockup} />
              <div style={artStyles.mockupShadow} />
            </div>
          </section>

          <footer style={artStyles.artFooter}>
            <span>WEARALOOK.COM/PARTNERS</span>
            <span>03/05</span>
          </footer>
        </div>
      </main>
    </>
  );
}

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
            <span>WEARALOOK.COM</span>
            <span>05/05</span>
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
  mockupWrapper: {
    position: "absolute",
    right: "-80px",
    bottom: "-200px",
    animation: "floatArtAnimation 6s ease-in-out infinite",
    zIndex: 15,
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
    justifyContent: "space-between",
    padding: "40px 80px",
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "4px",
    color: "rgba(0,0,0,0.35)",
    borderTop: "2px solid rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 20,
  }
};
