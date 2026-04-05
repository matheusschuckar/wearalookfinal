"use client";

import { useEffect, useState } from "react";
import Head from "next/head"; // Se estiver usando Next.js

export default function OpenAppPage() {
  const appStoreUrl =
    "https://apps.apple.com/br/app/look-moda-em-minutos/id6755046144";
  const iPhoneMockupUrl =
    "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Gray%20and%20Black%20Modern%20Handphone%20Mockup%20Instagram%20Story.png";

  // Estado para controlar uma animação suave de entrada dos elementos
  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    setDomReady(true);
    
    // Lógica de Redirecionamento Automático (Mantida)
    const start = Date.now();

    // Tenta abrir o app via Deep Link
    window.location.href = "look://";

    // Fallback para App Store se o app não abrir em 1.5s
    const timer = setTimeout(() => {
      const elapsed = Date.now() - start;
      // Se ainda estiver na página, provavelmente o app não abriu
      if (elapsed < 2000) {
        window.location.href = appStoreUrl;
      }
    }, 1500);

    return () => clearTimeout(timer); // Limpeza do timer
  }, []);

  return (
    <>
      {/* Configurações de SEO e Meta nativas do Next.js */}
      <Head>
        <title>LOOK | Moda em Minutos - Abrindo App</title>
        <meta name="theme-color" content="#F6F3ED" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <main style={{...styles.main, opacity: domReady ? 1 : 0}}>
        
        {/* HEADER SIMPLISTA (Apenas Logo) */}
        <header style={styles.header}>
          <TextBrutal size={20} weight={800} tracking={-1}>Look</TextBrutal>
        </header>

        {/* CONTEÚDO PRINCIPAL (Grid) */}
        <div style={styles.gridContainer}>
          
          {/* COLUNA ESQUERDA: Texto e Ação */}
          <div style={styles.textColumn}>
            <div style={styles.editorialBlock}>
              <TextBrutal size={12} weight={700} tracking={3} color="#888" uppercased>
                SISTEMA DE ACESSO INSTANTÂNEO
              </TextBrutal>
              
              <h1 style={styles.heroTitle}>
                CONECTANDO VOCÊ AO FASHION VAULT.
              </h1>
              
              <p style={styles.heroSubtitle}>
                Estamos abrindo o app da Look para você acessar curadorias exclusivas e inteligência de moda agora.
              </TextBrutal>
            </div>

            {/* ÁREA DE FALLBACK */}
            <VStack spacing={16} align="leading" style={styles.fallbackArea}>
              <TextBrutal size={13} weight={600} color="#666">
                Se o redirecionamento automático falhar, utilize o terminal abaixo:
              </TextBrutal>
              
              <a href={appStoreUrl} style={styles.brutalButton}>
                <HStack spacing={12}>
                  <TextBrutal size={13} weight={700} tracking={1.5} uppercased>
                    Acessar App Store
                  </TextBrutal>
                  <span style={{ fontSize: '18px' }}>→</span>
                </HStack>
              </a>
            </VStack>
          </div>

          {/* COLUNA DIREITA: Mockup do iPhone flutuante */}
          <div style={styles.imageColumn}>
            <div style={styles.imageConstraint}>
              <img 
                src={iPhoneMockupUrl} 
                alt="Look App on iPhone Mockup" 
                style={styles.iphoneMockup}
              />
              {/* Sombra Brutalista no chão */}
              <div style={styles.brutalShadow} />
            </div>
          </div>

        </div>

        {/* FOOTER MINIMALISTA */}
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
// MARK: - COMPONENTES UTILITÁRIOS (ESTILO SWIFTUI NO REACT)
// ======================================================

// Componente de Texto Padronizado (Look Style)
const TextBrutal = ({ size, weight, tracking, color, uppercased, children, style }) => (
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

// Containers de Layout Simplificados
const HStack = ({ spacing, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: `${spacing}px`, ...style }}>{children}</div>
);
const VStack = ({ spacing, align, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'leading' ? 'flex-start' : 'center', gap: `${spacing}px`, ...style }}>{children}</div>
);


// ======================================================
// MARK: - OBJETO DE ESTILOS (CSS-in-JS Brutalista)
// ======================================================

const styles = {
  main: {
    // Fundo Bege "Osso" do novo design
    backgroundColor: "#F6F3ED", 
    color: "#000",
    minHeight: "100vh",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    display: "flex",
    flexDirection: "column",
    transition: "opacity 0.6s ease-out", // Animação de entrada
    overflowX: "hidden",
  },
  header: {
    padding: "24px 40px", // Margem alinhada ao grid global
    borderBottom: "1px solid rgba(0,0,0,0.08)", // Borda fina brutalista
  },
  gridContainer: {
    flex: 1,
    display: "grid",
    // Grid Editorial: Texto maior à esquerda, imagem à direita
    gridTemplateColumns: "1.2fr 1fr", 
    gap: "40px",
    alignItems: "center",
    maxWidth: "1300px",
    margin: "0 auto",
    padding: "60px 40px",
    // Responsividade Básica (para mobile)
    "@media (max-width: 900px)": {
      gridTemplateColumns: "1fr",
      textAlign: "center",
      padding: "40px 20px",
    }
  },
  textColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    // Ajuste responsivo
    "@media (max-width: 900px)": {
      alignItems: "center",
    }
  },
  editorialBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "60px",
  },
  heroTitle: {
    fontSize: "56px",
    fontWeight: 700,
    letterSpacing: "-2px", // Tracking negativo agressivo para títulos
    lineHeight: "1.05",
    margin: 0,
    textTransform: "uppercase", // Manchete editorial
    // Responsividade do título
    "@media (max-width: 600px)": {
      fontSize: "38px",
      letterSpacing: "-1px",
    }
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
  },
  // BOTÃO BRUTALISTA (Zero Curvas)
  brutalButton: {
    display: "inline-block",
    padding: "16px 24px",
    backgroundColor: "#000", // Preto tinta sólido
    color: "#fff",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    width: "100%",
    textAlign: "center",
    // Efeito Hover sutil
    ":hover": {
      backgroundColor: "#333",
    }
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
    // Faz o iPhone flutuar levemente
    animation: "floatAnimation 6s ease-in-out infinite", 
  },
  iphoneMockup: {
    width: "100%",
    maxWidth: "340px", // Tamanho controlado do mockup
    height: "auto",
    zIndex: 2,
    // Sombra suave para destacar do fundo claro
    filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.15))", 
  },
  brutalShadow: {
    // Sombra projetada no "chão" para efeito 3D brutalista
    position: "absolute",
    bottom: "-20px",
    width: "160px",
    height: "20px",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: "100%", // A única curva é na sombra projetada
    filter: "blur(10px)",
    zIndex: 1,
  },
  footer: {
    padding: "20px 40px",
    textAlign: "center",
    borderTop: "1px solid rgba(0,0,0,0.05)",
  },
};

// MARK: - KEYFRAMES (CSS embutido para animações)
if (typeof Intl !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
    styleSheet.insertRule(`
      @keyframes floatAnimation {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
        100% { transform: translateY(0px); }
      }
    `, styleSheet.cssRules.length);
    
    // Media queries brutalistas injetadas
    styleSheet.insertRule(`
      @media (max-width: 900px) {
        body { overflow-x: hidden; }
        div[style*="display: grid"] { grid-template-columns: 1fr !important; textAlign: center !important; padding: 40px 20px !important;}
        div[style*="alignItems: flex-start"] { alignItems: center !important; }
        h1 { fontSize: 38px !important; letterSpacing: -1px !important; }
      }
    `, styleSheet.cssRules.length);
  }
}
