"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import Head from "next/head";

export default function OpenAppPage() {
  const appStoreUrl =
    "https://apps.apple.com/br/app/look-moda-em-minutos/id6755046144";

  const iPhoneMockupUrl =
    "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png";

  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    setDomReady(true);

    setTimeout(() => {
      window.location.href = "look://";
    }, 300);
  }, []);

  return (
    <>
      <Head>
        <title>LOOK | Moda em minutos</title>
        <meta name="theme-color" content="#F6F3ED" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Head>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          margin: 0;
          background-color: #F6F3ED;
        }

        @keyframes floatAnimation {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }

        .container {
          max-width: 480px;
          margin: 0 auto;
          padding: env(safe-area-inset-top) 20px env(safe-area-inset-bottom);
        }

        @media (min-width: 900px) {
          .container {
            max-width: 1100px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            align-items: center;
            gap: 60px;
          }
        }
      `,
        }}
      />

      <main style={{ ...styles.main, opacity: domReady ? 1 : 0 }}>
        <div className="container">
          <header style={styles.header}>
            <span style={{ fontWeight: 800 }}>Look</span>
          </header>

          <div className="grid">
            {/* TEXT */}
            <div style={styles.textColumn}>
              <span style={styles.kicker}>MODA EM MINUTOS</span>

              <h1 style={styles.title}>
                A moda que você quer,
                <br />
                na hora que você quer.
              </h1>

              <p style={styles.subtitle}>
                As melhores marcas, entregues em minutos.
              </p>

              <div style={styles.ctaBox}>
                <a href={appStoreUrl} style={styles.button}>
                  Abrir na App Store →
                </a>
              </div>
            </div>

            {/* IMAGE */}
            <div style={styles.imageWrapper}>
              <img
                src={iPhoneMockupUrl}
                alt="Look App"
                style={styles.image}
              />
            </div>
          </div>

          <footer style={styles.footer}>© LOOK</footer>
        </div>
      </main>
    </>
  );
}

// STYLES

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    transition: "opacity 0.5s",
  },

  header: {
    padding: "12px 0 24px",
    fontSize: "18px",
  },

  textColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  kicker: {
    fontSize: "11px",
    letterSpacing: "1.5px",
    color: "#888",
  },

  title: {
    fontSize: "34px",
    lineHeight: 1.1,
    margin: 0,
  },

  subtitle: {
    fontSize: "15px",
    color: "rgba(0,0,0,0.65)",
  },

  ctaBox: {
    marginTop: "12px",
  },

  button: {
    display: "block",
    width: "100%",
    textAlign: "center",
    backgroundColor: "#000",
    color: "#fff",
    padding: "16px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
  },

  imageWrapper: {
    marginTop: "40px",
    display: "flex",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    maxWidth: "280px",
    animation: "floatAnimation 6s ease-in-out infinite",
  },

  footer: {
    marginTop: "40px",
    fontSize: "11px",
    color: "#aaa",
    textAlign: "center",
  },
};        body { 
          margin: 0; 
          background-color: #F6F3ED; 
          overflow-x: hidden; 
        }

        @keyframes floatAnimation {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }

        .grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
          max-width: 1300px;
          margin: 0 auto;
          padding: 60px 40px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 40px 20px;
          }
        }
      `,
        }}
      />

      <main style={{ ...styles.main, opacity: domReady ? 1 : 0 }}>
        <header style={styles.header}>
          <Text size={20} weight={800}>
            Look
          </Text>
        </header>

        <div className="grid">
          {/* TEXT */}
          <div style={styles.textColumn}>
            <div style={styles.block}>
              <Text size={12} weight={700} color="#888" upper>
                MODA EM MINUTOS
              </Text>

              <h1 style={styles.title}>
                A moda que você quer,
                <br />
                na hora que você quer.
              </h1>

              <p style={styles.subtitle}>
                A Look conecta você às melhores marcas e entrega em minutos.
                Sem espera, sem fricção.
              </p>
            </div>

            <div style={styles.ctaBox}>
              <Text size={13} weight={600} color="#666">
                Não abriu automaticamente?
              </Text>

              <a href={appStoreUrl} style={styles.button}>
                Abrir na App Store →
              </a>
            </div>
          </div>

          {/* IMAGE */}
          <div style={styles.imageColumn}>
            <img
              src={iPhoneMockupUrl}
              alt="Look App"
              style={styles.image}
            />
          </div>
        </div>

        <footer style={styles.footer}>
          <Text size={10} color="#AAA">
            © LOOK
          </Text>
        </footer>
      </main>
    </>
  );
}

// COMPONENTES

const Text = ({
  size,
  weight,
  color,
  upper,
  children,
}: any) => (
  <span
    style={{
      fontSize: size,
      fontWeight: weight || 400,
      color: color || "#000",
      textTransform: upper ? "uppercase" : "none",
      lineHeight: 1.4,
    }}
  >
    {children}
  </span>
);

// STYLES

const styles: Record<string, CSSProperties> = {
  main: {
    backgroundColor: "#F6F3ED",
    minHeight: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    display: "flex",
    flexDirection: "column",
    transition: "opacity 0.6s",
  },
  header: {
    padding: "24px 40px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  textColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "40px",
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  title: {
    fontSize: "48px",
    lineHeight: 1.05,
    margin: 0,
  },
  subtitle: {
    fontSize: "16px",
    color: "rgba(0,0,0,0.7)",
    maxWidth: "420px",
  },
  ctaBox: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  button: {
    backgroundColor: "#000",
    color: "#fff",
    padding: "14px 20px",
    textDecoration: "none",
    borderRadius: "6px",
    display: "inline-block",
    width: "fit-content",
  },
  imageColumn: {
    display: "flex",
    justifyContent: "center",
  },
  image: {
    maxWidth: "320px",
    animation: "floatAnimation 6s ease-in-out infinite",
  },
  footer: {
    padding: "20px",
    textAlign: "center",
  },
};
