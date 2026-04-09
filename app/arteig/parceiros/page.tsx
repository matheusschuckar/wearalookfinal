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
