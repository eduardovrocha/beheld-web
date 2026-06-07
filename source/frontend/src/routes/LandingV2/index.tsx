/**
 * LandingV2 — landing de / (kit landing-v2-integration), "cripto-
 * brutalist refinado · terminal-native" com hero rotativo A→B→C→D.
 *
 * Single long-scroll page implementando landing-v2-integration/README.md
 * com src/routes/LandingV2 do kit como fonte, adaptado às convenções do
 * app: i18n próprio (chaves planas `landingV2.*` via T.tsx, sem
 * react-i18next), InstallBox/MachineCounter/BrandMark/Eyebrow/Toggles
 * reutilizados, reveals via useRevealMany. Renderiza FORA do <Layout>
 * — ver o carve-out de routing em App.tsx.
 *
 *   .landing-v2-kit
 *     <a .skip-link>                  (a11y: pula para #main)
 *     <Nav />                         (sticky: brand + âncoras + toggles)
 *     <main id="main">
 *       <Hero />                      (#top · variantes + counter + install + term)
 *       <TriangleBand />              (GitHub prova / LinkedIn prova / Beheld atesta)
 *       <ToolsStrip />
 *       <Manifesto />                 (#manifesto · 01)
 *       <ThesisBand />                (categoria · uma frase)
 *       <WhyInstall />                (#por-que-hoje · beat não-numerado)
 *       <B3H31D />                    (#B3H31D · 02 + flow + privacidade)
 *       <Steps />                     (03 · três passos)
 *       <Sessions />                  (#sessoes · 04)
 *       <ClaimedVsDemonstrated />     (05)
 *       <Verification />              (#verificacao · 06 + chain + FAQ)
 *       <Scenes />                    (07 · cenas reais)
 *       <ConsequenceBand />           (recrutamento é a consequência)
 *       <CTA />
 *     </main>
 *     <Footer />
 *
 * A paleta vive em landing-v2-kit.css (dark default + claro opt-in via
 * html[data-theme-v2="light"] — design_handoff_temas); enquanto montada
 * a rota adiciona `landing-v2-kit-page` ao <html> para neutralizar o
 * chrome do tema global (borda dourada, zoom 1.1, noise) e habilitar
 * scroll suave de âncoras.
 *
 * Reveals: useRevealMany observa todo descendente `[data-reveal]`
 * (threshold 0.15, como no kit), honrando prefers-reduced-motion.
 */
import { useEffect } from "react";

import { useRevealMany } from "@/hooks/useReveal";

import { T, useT } from "./T";
import { Nav, Footer } from "./sections/Chrome";
import { Hero } from "./sections/Hero";
import {
  TriangleBand,
  ToolsStrip,
  ThesisBand,
  ConsequenceBand,
} from "./sections/Bands";
import { Manifesto } from "./sections/Manifesto";
import { WhyInstall } from "./sections/WhyInstall";
import { B3H31D } from "./sections/B3H31D";
import { Steps } from "./sections/Steps";
import { Sessions } from "./sections/Sessions";
import { ClaimedVsDemonstrated } from "./sections/ClaimedVsDemonstrated";
import { Verification } from "./sections/Verification";
import { Scenes } from "./sections/Scenes";
import { CTA } from "./sections/CTA";

// Scoped stylesheet. Side-effect import: o Vite empacota no chunk desta
// rota; os seletores `.landing-v2-kit …` ficam dormentes nas demais.
import "@/styles/landing-v2-kit.css";

export function LandingV2() {
  const t = useT();
  const rootRef = useRevealMany<HTMLDivElement>("[data-reveal]", { threshold: 0.15 });

  // Neutraliza o chrome global (tema) enquanto a landing está montada.
  useEffect(() => {
    document.documentElement.classList.add("landing-v2-kit-page");
    return () => document.documentElement.classList.remove("landing-v2-kit-page");
  }, []);

  // Título por locale; restaura o título estático do index.html ao sair.
  useEffect(() => {
    const prev = document.title;
    document.title = t("meta.title");
    return () => {
      document.title = prev;
    };
  }, [t]);

  return (
    <div className="landing-v2-kit" ref={rootRef}>
      <a className="skip-link" href="#main">
        <T k="a11y.skip" />
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <TriangleBand />
        <ToolsStrip />
        <Manifesto />
        <ThesisBand />
        <WhyInstall />
        <B3H31D />
        <Steps />
        <Sessions />
        <ClaimedVsDemonstrated />
        <Verification />
        <Scenes />
        <ConsequenceBand />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
