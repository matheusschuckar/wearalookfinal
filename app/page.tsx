"use client";

import { useEffect } from "react";

export default function OpenAppPage() {
  useEffect(() => {
    const appStoreUrl =
      "https://apps.apple.com/br/app/look-moda-em-minutos/id6755046144";

    const start = Date.now();

    // Tenta abrir o app (caso você tenha deep link configurado depois)
    window.location.href = "look://";

    // Fallback pra App Store
    setTimeout(() => {
      const elapsed = Date.now() - start;

      // Se ainda estiver na página, provavelmente não abriu o app
      if (elapsed < 2000) {
        window.location.href = appStoreUrl;
      }
    }, 1500);
  }, []);

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>Abrindo a Look...</h1>
      <p style={styles.subtitle}>
        Se nada acontecer, toque no botão abaixo
      </p>

      <a
        href="https://apps.apple.com/br/app/look-moda-em-minutos/id6755046144"
        style={styles.button}
      >
        Ir para App Store
      </a>
    </main>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "sans-serif",
    textAlign: "center" as const,
    padding: "24px",
  },
  title: {
    fontSize: "24px",
    marginBottom: "12px",
  },
  subtitle: {
    fontSize: "14px",
    marginBottom: "24px",
    color: "#666",
  },
  button: {
    padding: "12px 20px",
    backgroundColor: "#000",
    color: "#fff",
    borderRadius: "8px",
    textDecoration: "none",
  },
};
