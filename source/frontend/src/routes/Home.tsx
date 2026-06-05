/**
 * Home — landing v2 ("cripto-brutalist refinado · terminal-native").
 *
 * Single long-scroll page implementing design_handoff/README.md, with
 * reference/{beheld.css,landing.css} as the visual source of truth.
 * Dark-only, wide container (max 1560px). Renders OUTSIDE <Layout> —
 * see App.tsx for the routing carve-out.
 *
 *   .landing-v2
 *     <a .skip-link>                  (a11y: jumps to #main)
 *     <LandingNav />                  (sticky: brand + anchors + locale)
 *     <main id="main">
 *       <Hero />                      (#top · h1 + counter + install + term)
 *       <ToolsStrip />
 *       <Manifesto />                 (#manifesto · 01)
 *       <DaemonSection />             (#daemon · 02)
 *       <HowItWorks />                (03 · três passos)
 *       <RealSessionsSection />       (#sessoes · 04)
 *       <ClaimedVsDemonstrated />     (05)
 *       <Verification />              (#verificacao · 06 + chain + FAQ)
 *       <Scenes />                    (07 · cenas reais)
 *       <CTABand />
 *     </main>
 *     <LandingFooter />
 *
 * The landing fixes its own palette in landing-v2.css; while mounted it
 * adds `landing-v2-page` to <html> to neutralise the global theme
 * chrome (gold top border, body zoom 1.1, noise texture) and enable
 * smooth anchor scrolling.
 *
 * Reveals: useRevealMany observes every `.reveal` descendant (threshold
 * 0.15 per the handoff), honouring prefers-reduced-motion.
 */
import { useEffect } from "react";

import { DaemonSection } from "@/components/landing/DaemonSection";
import { Hero } from "@/components/landing/Hero";
import { LandingNav } from "@/components/landing/LandingNav";
import { RealSessionsSection } from "@/components/landing/RealSessionsSection";
import { ToolsStrip } from "@/components/landing/ToolsStrip";
import { Verification } from "@/components/landing/Verification";
import {
  CTABand,
  ClaimedVsDemonstrated,
  HowItWorks,
  LandingFooter,
  Manifesto,
  Scenes,
} from "@/components/landing/sections";
import { useRevealMany } from "@/hooks/useReveal";
import { useT } from "@/i18n/I18nProvider";

// Scoped landing-v2 stylesheet. Side-effect import: Vite bundles it
// into the chunk emitted for this route. Other routes never reach this
// file, so its `.landing-v2 …` selectors stay dormant there.
import "@/styles/landing-v2.css";

export function Home() {
  const t = useT();
  const rootRef = useRevealMany<HTMLDivElement>(".reveal", { threshold: 0.15 });

  // Neutralise the global (themed) chrome while the landing is mounted.
  useEffect(() => {
    document.documentElement.classList.add("landing-v2-page");
    return () => document.documentElement.classList.remove("landing-v2-page");
  }, []);

  return (
    <div className="landing-v2" ref={rootRef}>
      <a className="skip-link" href="#main">
        {t("landing.a11y.skip")}
      </a>
      <LandingNav />
      <main id="main">
        <Hero />
        <ToolsStrip />
        <Manifesto />
        <DaemonSection />
        <HowItWorks />
        <RealSessionsSection />
        <ClaimedVsDemonstrated />
        <Verification />
        <Scenes />
        <CTABand />
      </main>
      <LandingFooter />
    </div>
  );
}
