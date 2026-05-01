"use client";

import React, { useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";

// ==========================================
// 1. TIPAGEM ESTRITA
// ==========================================
type SkillCategory = { title: string; items: string[] };

type ProjectData = {
  title: string;
  category: string;
  desc: string;
  features: string[];
  built: string[];
  imageColor: string;
  layout: "single" | "split";
};

type Translation = {
  hero: {
    role1: string;
    role2: string;
    subtitle: string;
    desc: string;
    btnProjects: string;
    btnContact: string;
  };
  about: {
    title: string;
    p1: string;
    p2: string;
    expTitle: string;
    expList: string[];
  };
  skills: {
    title: string;
    mobile: SkillCategory;
    frontend: SkillCategory;
    backend: SkillCategory;
    other: SkillCategory;
  };
  projects: {
    title: string;
    featTitle: string;
    builtTitle: string;
    p1: ProjectData;
    p2: ProjectData;
    p3: ProjectData;
  };
  approach: { title: string; desc: string; footer: string };
  contact: { title: string; desc: string; email: string; linkedin: string };
};

// ==========================================
// 2. DICIONÁRIO DE IDIOMAS
// ==========================================
const en: Translation = {
  hero: {
    role1: "FULL STACK",
    role2: "DEVELOPER",
    subtitle: "iOS (Swift, SwiftUI) & Web (React, Next.js)",
    desc: "Architecting high-performance digital products. Specializing in native iOS and scalable web applications with structural precision.",
    btnProjects: "View Archive",
    btnContact: "Initiate Contact",
  },
  about: {
    title: "The Architecture",
    p1: "Bridging the gap between flawless frontend interfaces and robust backend systems.",
    p2: "I engineer end-to-end digital products focusing on uncompromising performance, scalability, and code that feels meticulously crafted. Every line serves a structural purpose.",
    expTitle: "Domains of Expertise",
    expList: [
      "Native iOS Applications",
      "High-Conversion Web Platforms",
      "Complex Admin Dashboards",
      "Backend & API Architecture",
    ],
  },
  skills: {
    title: "Technical Stack",
    mobile: {
      title: "Mobile",
      items: ["Swift", "SwiftUI", "MVC / MVVM", "REST APIs"],
    },
    frontend: {
      title: "Frontend",
      items: ["React.js", "Next.js", "TypeScript", "Tailwind CSS"],
    },
    backend: {
      title: "Backend",
      items: ["Node.js", "Supabase", "PostgreSQL", "Auth Systems"],
    },
    other: {
      title: "Operations",
      items: [
        "Git Versioning",
        "Performance Ops",
        "Cloud Deployment",
        "System Design",
      ],
    },
  },
  projects: {
    title: "Selected Archive",
    featTitle: "Architecture",
    builtTitle: "Implementation",
    p1: {
      title: "Look App",
      category: "iOS Native",
      desc: "Native iOS application built with Swift and SwiftUI. Engineered for absolute fluidity and high-performance rendering.",
      features: [
        "Real-time data",
        "API integration",
        "Optimized rendering",
        "Scalable arch",
      ],
      built: ["SwiftUI", "MVVM", "Backend integration"],
      imageColor: "bg-neutral-900",
      layout: "single",
    },
    p2: {
      title: "Landing Page",
      category: "Web Ecosystem",
      desc: "A unified web presence encompassing a high-conversion consumer landing page driving App Store downloads, alongside a robust B2B onboarding architecture for business partners.",
      features: [
        "Sub-second load times",
        "Conversion UX",
        "Lead generation logic",
        "B2B Messaging",
      ],
      built: [
        "Next.js architecture",
        "TailwindCSS",
        "Conversion flows",
        "Performance tuning",
      ],
      imageColor: "bg-neutral-800",
      layout: "split",
    },
    p3: {
      title: "Brand Dashboard",
      category: "Web Dashboard",
      desc: "Command center for operations, data, and inventory management. Dark-UI data visualization.",
      features: ["Auth logic", "Real-time sync", "Data visualization"],
      built: ["Node.js Backend", "Supabase + SQL", "React Frontend"],
      imageColor: "bg-neutral-800",
      layout: "single",
    },
  },
  approach: {
    title: "Philosophy",
    desc: "Minimalist opulence in code. Applications must be scalable, maintainable, and performance-driven.",
    footer: "Clean architecture is not an option; it is the baseline.",
  },
  contact: {
    title: "Let's Collaborate",
    desc: "Available for select freelance projects and long-term partnerships.",
    email: "hello@mondeagency.com",
    linkedin: "LinkedIn",
  },
};

const pt: Translation = {
  hero: {
    role1: "FULL STACK",
    role2: "DEVELOPER",
    subtitle: "iOS (Swift, SwiftUI) & Web (React, Next.js)",
    desc: "Arquitetando produtos digitais de alta performance. Especializado em iOS nativo e aplicações web escaláveis com precisão estrutural.",
    btnProjects: "Ver Arquivo",
    btnContact: "Iniciar Contato",
  },
  about: {
    title: "A Arquitetura",
    p1: "Conectando interfaces frontend impecáveis a sistemas backend robustos.",
    p2: "Desenvolvo produtos digitais de ponta a ponta com foco em performance absoluta, escalabilidade e código meticulosamente elaborado. Cada linha tem um propósito estrutural.",
    expTitle: "Domínios de Expertise",
    expList: [
      "Aplicações iOS Nativas",
      "Plataformas Web de Alta Conversão",
      "Dashboards Administrativos Complexos",
      "Arquitetura de Backend e APIs",
    ],
  },
  skills: en.skills,
  projects: {
    title: "Arquivo Selecionado",
    featTitle: "Arquitetura",
    builtTitle: "Implementação",
    p1: {
      title: "Look App",
      category: "iOS Nativo",
      desc: "Aplicativo iOS nativo construído com Swift e SwiftUI. Projetado para fluidez absoluta e renderização de alta performance.",
      features: [
        "Dados em tempo real",
        "Integração API",
        "Renderização otimizada",
        "Arquitetura escalável",
      ],
      built: [
        "Implementação SwiftUI",
        "Design estrutural de navegação",
        "Integração backend",
      ],
      imageColor: "bg-neutral-900",
      layout: "single",
    },
    p2: {
      title: "Landing Page",
      category: "Ecossistema Web",
      desc: "Presença web unificada que integra uma landing page de alta conversão focada em downloads na App Store, juntamente com uma arquitetura B2B robusta para onboarding de parceiros de negócios.",
      features: [
        "Carregamento sub-segundo",
        "UX de Conversão",
        "Lógica de leads",
        "Mensagem B2B",
      ],
      built: [
        "Arquitetura Next.js",
        "TailwindCSS",
        "Fluxos de conversão",
        "Performance tuning",
      ],
      imageColor: "bg-neutral-800",
      layout: "split",
    },
    p3: {
      title: "Brand Dashboard",
      category: "Dashboard Web",
      desc: "Centro de comando para operações, dados e gerenciamento de inventário. Visualização de dados em Dark-UI.",
      features: [
        "Lógica Auth",
        "Sincronia em tempo real",
        "Visualização de dados",
      ],
      built: ["Backend Node.js", "Supabase + SQL", "Frontend React"],
      imageColor: "bg-neutral-800",
      layout: "single",
    },
  },
  approach: en.approach,
  contact: {
    title: "Vamos Criar",
    desc: "Disponível para projetos sob medida e parcerias de longo prazo.",
    email: "hello@mondeagency.com",
    linkedin: "LinkedIn",
  },
};

const dict: Record<"en" | "pt", Translation> = { en, pt };

// ==========================================
// 3. COMPONENTES DE DESIGN (Construção Estrutural)
// ==========================================

const ProjectBlock = ({
  project,
  index,
  t,
}: {
  project: ProjectData;
  index: number;
  t: Translation["projects"];
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex flex-col ${
        index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
      } gap-0 w-full bg-[#050505] border border-[#1A1A1A] rounded-sm overflow-hidden hover:border-[#333333] transition-colors duration-700`}
    >
      {/* Imagem Container - Tratamento Condicional para Layout Single/Split */}
      <div
        className={`w-full lg:w-1/2 min-h-[400px] lg:min-h-[600px] flex ${
          project.layout === "split" ? "flex-row" : ""
        }`}
      >
        {project.layout === "single" ? (
          <div className="relative w-full h-full overflow-hidden bg-[#0A0A0A] border-b lg:border-b-0 lg:border-r border-[#1A1A1A]">
            <div className="absolute inset-0 bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <motion.div className="absolute inset-0 flex items-center justify-center text-[#666666] group-hover:scale-[1.02] transition-transform duration-1000 ease-out">
              <div className="flex flex-col items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase border border-[#1A1A1A] px-6 py-3 rounded-sm bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  Asset Required
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex gap-4 text-[9px] font-mono uppercase tracking-widest text-[#666666] mt-2">
                  <span>W: 1920PX</span>
                  <span>/</span>
                  <span>H: 1080PX</span>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // Layout Split: Duas colunas para acomodar Consumer e Portal
          <>
            <div className="relative w-1/2 h-full overflow-hidden bg-[#0A0A0A] border-r border-b lg:border-b-0 border-[#1A1A1A]">
              <div className="absolute inset-0 bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <motion.div className="absolute inset-0 flex items-center justify-center text-[#666666] group-hover:scale-[1.02] transition-transform duration-1000 ease-out">
                <div className="flex flex-col items-center gap-3">
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#666666] mb-2">
                    Consumer
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase border border-[#1A1A1A] px-4 py-2 rounded-sm bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    Asset
                  </span>
                </div>
              </motion.div>
            </div>
            <div className="relative w-1/2 h-full overflow-hidden bg-[#0A0A0A] border-b lg:border-b-0 lg:border-r border-[#1A1A1A]">
              <div className="absolute inset-0 bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <motion.div className="absolute inset-0 flex items-center justify-center text-[#666666] group-hover:scale-[1.02] transition-transform duration-1000 ease-out">
                <div className="flex flex-col items-center gap-3">
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#666666] mb-2">
                    Portal
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase border border-[#1A1A1A] px-4 py-2 rounded-sm bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    Asset
                  </span>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* Info Container - Alto Contraste e Linhas Arquitetônicas */}
      <div className="w-full lg:w-1/2 p-10 md:p-16 flex flex-col justify-center bg-[#050505] relative">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-[10px] font-mono text-[#EAEAEA] border border-[#333333] px-3 py-1 rounded-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="h-px w-8 bg-[#1A1A1A]" />
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#888888]">
            {project.category}
          </span>
        </div>

        <h3 className="text-4xl md:text-5xl font-medium tracking-tighter text-[#FFFFFF] mb-6">
          {project.title}
        </h3>

        <p className="text-sm text-[#A0A0A0] font-light leading-relaxed mb-12 max-w-md">
          {project.desc}
        </p>

        <div className="grid grid-cols-2 gap-8 border-t border-[#1A1A1A] pt-8 mt-auto">
          <div>
            <h4 className="text-[9px] font-medium uppercase tracking-[0.3em] text-[#666666] mb-4">
              {t.featTitle}
            </h4>
            <ul className="space-y-2">
              {project.features.map((f) => (
                <li
                  key={f}
                  className="text-xs text-[#CCCCCC] font-light tracking-wide"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[9px] font-medium uppercase tracking-[0.3em] text-[#666666] mb-4">
              {t.builtTitle}
            </h4>
            <ul className="space-y-2">
              {project.built.map((b) => (
                <li
                  key={b}
                  className="text-xs text-[#CCCCCC] font-light tracking-wide"
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// 4. COMPONENTE PRINCIPAL
// ==========================================
export default function PortfolioPremium() {
  const [lang, setLang] = useState<"en" | "pt">("en");
  const [scrolled, setScrolled] = useState(false);
  const t = dict[lang];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="bg-[#030303] text-[#EAEAEA] min-h-screen font-sans selection:bg-[#EAEAEA] selection:text-[#030303]">
      {/* Ruído em alta densidade para textura premium */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none z-50 mix-blend-screen"
        aria-hidden="true"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* NAVBAR */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 w-full z-40 transition-all duration-700 ${
          scrolled
            ? "bg-[#030303]/90 backdrop-blur-xl border-b border-[#1A1A1A] py-5"
            : "bg-transparent py-10"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex justify-between items-center">
          <span className="text-[10px] font-medium tracking-[0.4em] uppercase text-[#FFFFFF]">
            Monde Agency
          </span>
          <div className="flex gap-4">
            {(["en", "pt"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[9px] font-medium uppercase tracking-[0.3em] transition-colors duration-300 ${
                  lang === l
                    ? "text-[#FFFFFF] border-b border-[#FFFFFF] pb-1"
                    : "text-[#666666] hover:text-[#A0A0A0] pb-1"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* ================= HERO ================= */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 max-w-[1400px] mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="mb-10 flex items-center gap-4"
        >
          <div className="h-px w-12 bg-[#333333]" />
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#888888]">
            {t.hero.subtitle}
          </span>
        </motion.div>

        <div className="flex flex-col mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-[13vw] md:text-[9vw] font-medium leading-[0.85] tracking-tighter text-[#FFFFFF]"
          >
            {t.hero.role1}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-[13vw] md:text-[9vw] font-medium leading-[0.85] tracking-tighter text-[#CCCCCC]"
          >
            {t.hero.role2}
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-t border-[#1A1A1A] pt-12"
        >
          <p className="text-sm md:text-base font-light text-[#A0A0A0] leading-relaxed max-w-xl tracking-wide">
            {t.hero.desc}
          </p>

          <div className="flex gap-8 text-[10px] uppercase tracking-[0.3em] font-medium">
            <a
              href="#projects"
              className="text-[#FFFFFF] hover:text-[#888888] transition-colors duration-300"
            >
              {t.hero.btnProjects}
            </a>
            <a
              href="#contact"
              className="text-[#FFFFFF] hover:text-[#888888] transition-colors duration-300"
            >
              {t.hero.btnContact}
            </a>
          </div>
        </motion.div>
      </section>

      {/* ================= ABOUT ================= */}
      <section className="py-40 px-6 md:px-12 bg-[#050505] border-t border-[#1A1A1A]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4 flex flex-col justify-between">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#666666]">
              / {t.about.title}
            </h2>
          </div>

          <div className="lg:col-span-8">
            <div className="mb-16 max-w-3xl">
              {/* O Título de Impacto (Separado) */}
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tighter text-[#FFFFFF] mb-8 leading-[1.1]">
                {t.about.p1}
              </h3>
              {/* O Parágrafo de Apoio (Separado e legível) */}
              <p className="text-base md:text-xl text-[#A0A0A0] font-light leading-relaxed">
                {t.about.p2}
              </p>
            </div>

            <div className="border-t border-[#1A1A1A] pt-10">
              <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#666666] mb-8">
                {t.about.expTitle}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                {t.about.expList.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b border-[#1A1A1A] pb-4"
                  >
                    <span className="text-[10px] font-mono text-[#666666]">
                      0{i + 1}
                    </span>
                    <span className="text-sm text-[#CCCCCC] font-light tracking-wide">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SKILLS ================= */}
      <section className="py-40 px-6 md:px-12 bg-[#030303] border-t border-[#1A1A1A]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#666666]">
              / {t.skills.title}
            </h2>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-16">
            {[
              t.skills.mobile,
              t.skills.frontend,
              t.skills.backend,
              t.skills.other,
            ].map((category, idx) => (
              <div key={idx} className="flex flex-col">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#FFFFFF] mb-8 border-b border-[#1A1A1A] pb-4">
                  {category.title}
                </h3>
                <ul className="space-y-4">
                  {category.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-[#A0A0A0] font-light tracking-wide"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROJECTS ================= */}
      <section
        id="projects"
        className="py-40 px-6 md:px-12 bg-[#030303] border-t border-[#1A1A1A]"
      >
        <div className="max-w-[1400px] mx-auto mb-24 flex justify-between items-end">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#666666]">
            / {t.projects.title}
          </h2>
        </div>

        <div className="max-w-[1400px] mx-auto flex flex-col gap-16">
          {[t.projects.p1, t.projects.p2, t.projects.p3].map(
            (project, index) => (
              <ProjectBlock
                key={index}
                project={project}
                index={index}
                t={t.projects}
              />
            )
          )}
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <section
        id="contact"
        className="py-40 px-6 md:px-12 bg-[#FFFFFF] text-[#030303]"
      >
        <div className="max-w-[1400px] mx-auto flex flex-col items-center text-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#888888] mb-12">
            / {t.contact.title}
          </span>

          <p className="text-xl md:text-3xl text-[#666666] font-light mb-20 max-w-2xl leading-relaxed">
            {t.contact.desc}
          </p>

          <a
            href={`mailto:${t.contact.email}`}
            className="group relative border border-[#030303] bg-transparent text-[#030303] px-16 py-6 rounded-sm text-[10px] font-medium uppercase tracking-[0.3em] overflow-hidden transition-colors duration-500 hover:text-[#FFFFFF]"
          >
            <span className="relative z-10">{t.contact.email}</span>
            <div className="absolute inset-0 bg-[#030303] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-in-out" />
          </a>
        </div>
      </section>

      <footer className="py-10 px-6 md:px-12 bg-[#FFFFFF] text-[#030303] border-t border-[#EAEAEA]">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-medium uppercase tracking-[0.3em] text-[#888888]">
          <p>© {new Date().getFullYear()} Monde Agency.</p>
          <a
            href="#"
            className="hover:text-[#030303] transition-colors duration-300"
          >
            {t.contact.linkedin}
          </a>
        </div>
      </footer>
    </main>
  );
}
