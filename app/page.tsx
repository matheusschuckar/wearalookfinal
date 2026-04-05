"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import Head from "next/head";

export default function OpenAppPage() {
  const appStoreUrl = "https://apps.apple.com/br/app/look-moda-em-minutos/id6755046144";
  const iPhoneMockupUrl = "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png";

  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    setDomReady(true);
    
    const start = Date.now();
    window.location.href = "look://";

    const timer = setTimeout(() => {
      const elapsed = Date.now() - start;
      if (elapsed < 2000) {
        window.location.href = appStoreUrl;
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>LOOK | Moda em Minutos</title>
        <meta name="theme-color" content="#F6F3ED" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      {/* 🔥 INJEÇÃO DE CSS SEGURA PARA SSR (VERCEL) */}
      <style dangerouslySetInnerHTML={{__html: `
        body { 
          margin: 0; 
          background-color: #F6F3ED; 
          overflow-x: hidden; 
        }
        
        @keyframes floatAnimation {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }

        .brutal-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
          max-width: 1300px;
          margin: 0 auto;
          padding: 60px 40px;
        }

        .text-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-title {
          font-size: 56px;
          letter-spacing: -2px;
        }

        @media (max-width: 900px) {
          .brutal-grid {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 40px 20px;
          }
          .text-column {
            align-items: center;
          }
          .hero-title {
            font-size: 38px;
            letter-spacing: -1px;
          }
        }
      `}} />

      <main style={{...styles.main, opacity: domReady ? 1 : 0}}>
        
        <header style={styles.header}>
          <TextBrutal size={20} weight={800} tracking={-1}>Look</TextBrutal>
        </header>

        <div className="brutal-grid">
          
          <div className="text-column">
            <div style={styles.editorialBlock}>
              <TextBrutal size={12} weight={700} tracking={3} color="#888" uppercased>
                SISTEMA DE ACESSO INSTANTÂNEO
              </TextBrutal>
              
              <h1 className="hero-title" style={styles.heroTitleBase}>
                CONECTANDO VOCÊ AO FASHION VAULT.
              </h1>
              
              <p style={styles.heroSubtitle}>
                Estamos abrindo o app da Look para você acessar curadorias exclusivas e inteligência de moda agora.
              </p>
            </div>

            <VStack spacing={16} align="flex-start" style={styles.fallbackArea}>
              <TextBrutal size={13} weight={600} color="#666">
                Se o redirecionamento automático falhar, utilize o terminal abaixo:
              </TextBrutal>
              
              <a href={appStoreUrl} style={styles.brutalButton} 
                 onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
                 onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#000'}>
                <HStack spacing={12} style={{justifyContent: 'center'}}>
                  <TextBrutal size={13} weight={700} tracking={1.5} color="#FFF" uppercased>
                    Acessar App Store
                  </TextBrutal>
                  <span style={{ fontSize: '18px', color: '#FFF' }}>→</span>
                </HStack>
              </a>
            </VStack>
          </div>

          <div style={styles.imageColumn}>
            <div style={styles.imageConstraint}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={iPhoneMockupUrl} 
                alt="Look App" 
                style={styles.iphoneMockup}
              />
              <div style={styles.brutalShadow} />
            </div>
          </div>

        </div>

        <footer style={styles.footer}>
          <TextBrutal size={10} weight={600} color="#AAA" tracking={0.5} uppercased>
            © 2024 WEARALOOK TECHNOLOGIES. ALL RIGHTS RESERVED.
          </TextBrutal>
        </footer>
      </main>
    </>
  );
}

// ======================================================
// MARK: - COMPONENTS TIPADOS PARA TYPESCRIPT
// ======================================================

interface TextBrutalProps {
  size: number;
  weight?: number;
  tracking?: number;
  color?: string;
  uppercased?: boolean;
  children: React.ReactNode;
  style?: CSSProperties;
}

const TextBrutal: React.FC<TextBrutalProps> = ({ size, weight, tracking, color, uppercased, children, style }) => (
  <span style={{
    fontSize: `${size}px`,
    fontWeight: weight || 400,
    letterSpacing: tracking ? `${tracking}px` : 'normal',
    color: color || '#000',
    textTransform: uppercased ? 'uppercase' : 'none',
    lineHeight: '1.4',
    ...style
  }}>
    {children}
  </span>
);

interface StackProps {
  spacing: number;
  children: React.ReactNode;
  style?: CSSProperties;
  align?: CSSProperties['alignItems'];
}

const HStack: React.FC<StackProps> = ({ spacing, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: `${spacing}px`, ...style }}>{children}</div>
);

const VStack: React.FC<StackProps> = ({ spacing, align, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: align || 'center', gap: `${spacing}px`, ...style }}>{children}</div>
);

// ======================================================
// MARK: - STYLES TIPADOS PARA TYPESCRIPT
// ======================================================

const styles: Record<string, CSSProperties> = {
  main: {
    backgroundColor: "#F6F3ED", 
    color: "#000",
    minHeight: "100vh",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: "flex",
    flexDirection: "column",
    transition: "opacity 0.6s ease-out",
  },
  header: {
    padding: "24px 40px", 
    borderBottom: "1px solid rgba(0,0,0,0.08)", 
  },
  editorialBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "60px",
  },
  heroTitleBase: {
    fontWeight: 700,
    lineHeight: "1.05",
    margin: 0,
    textTransform: "uppercase",
  },
  heroSubtitle: {
    fontSize: "16px",
    fontWeight: 500,
    color: "rgba(0,0,0,0.7)",
    lineHeight: "1.6",
    maxWidth: "480px",
    margin: "8px 0 0 0",
  },
  fallbackArea: {
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: "24px",
    border: "1px solid rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: "400px",
    boxSizing: "border-box"
  },
  brutalButton: {
    display: "inline-block",
    padding: "16px 24px",
    backgroundColor: "#000",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    width: "100%",
    textAlign: "center",
    boxSizing: "border-box"
  },
  imageColumn: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  imageConstraint: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    animation: "floatAnimation 6s ease-in-out infinite", 
  },
  iphoneMockup: {
    width: "100%",
    maxWidth: "340px",
    height: "auto",
    zIndex: 2,
    filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.15))", 
  },
  brutalShadow: {
    position: "absolute",
    bottom: "-20px",
    width: "160px",
    height: "20px",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: "100%", 
    filter: "blur(10px)",
    zIndex: 1,
  },
  footer: {
    padding: "20px 40px",
    textAlign: "center",
    borderTop: "1px solid rgba(0,0,0,0.05)",
  },
};
