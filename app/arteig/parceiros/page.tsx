"use client";

import React, { CSSProperties } from "react";
import Head from "next/head";

export default function LookPartnersSlide4() {
  const mockupUrl = "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/store_images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story-4.png";

  return (
    <>
      <Head>
        <title>Look Partners // TAILORED ACCESS</title>
      </Head>

      <main style={pageStyles.wrapper}>
        <div id="look-art-canvas-4" style={artStyles.canvas}>
          <section style={artStyles.heroTextSection}>
            <h1 style={artStyles.heroTitle}>
              TAILORED<br />
              CLIENT<br />
              ACCESS.
            </h1>
          </section>

          <div style={artStyles.divider} />

          <section style={artStyles.dossierSection}>
            <div style={artStyles.textDossier}>
              <header style={artStyles.dossierHeader}>
                <span style={artStyles.logo}>ESTRATÉGIA</span>
              </header>

              <div style={artStyles.block}>
                <p style={artStyles.subtitle}>
                  CRIE CONVITES.<br />
                  CONTROLE SEUS<br />
                  BENEFÍCIOS.
                </p>
                <p style={artStyles.support}>
                  CUPONS EXCLUSIVOS PARA<br/>SUA CLIENTELA SELECIONADA.
                </p>
              </div>
            </div>

            <div style={artStyles.mockupWrapper}>
              <img src={mockupUrl} alt="Criar Cupons" style={artStyles.mockup} />
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
    zIndex: 30, // Mockup na frente da linha do footer
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
    justifyContent: "flex-start", // Alinhado à esquerda
    padding: "40px 80px",
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "4px",
    color: "rgba(0,0,0,0.35)",
    borderTop: "2px solid rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 10, // Linha atrás do mockup
  }
};                  O SEU ESPAÇO.
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
    zIndex: 30, // Garante que o celular fique à frente da linha
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
    justifyContent: "flex-start", // Alinhamento à esquerda
    padding: "40px 80px",
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "4px",
    color: "rgba(0,0,0,0.35)",
    borderTop: "2px solid rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 10, // Menor que o zIndex do mockup (30)
  }
};
