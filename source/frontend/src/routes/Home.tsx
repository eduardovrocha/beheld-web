/**
 * Home — landing v5.
 *
 * Single-page composition mirroring docs/landing-motion-mockup.html:
 *
 *   .landing-v5
 *     <Constellation />                    (ambient bg, portal'd)
 *     <LandingTopbar />                    (LensMark + nav + ThemeToggle)
 *     <main class="wrap" id="top">
 *       <Hero />                           (eyebrow + h1 + lede + pill +
 *                                           install + tools + terminal)
 *       <Manifesto />
 *       <CaptureCards />                   (01 · O que o daemon captura)
 *       <NotDoingList />                   (O que o Beheld não faz)
 *       <ClaimedVsDemonstrated />          (02 · delta + self-declared)
 *       <HowItWorksSteps />                (03 · três passos)
 *       <VerificationChain />              (04 · cinco camadas)
 *       <FAQ />                            (As perguntas certas)
 *       <RealScenes />                     (Se isso já aconteceu)
 *       <CTASection />                     (install line + free)
 *     </main>
 *     <LandingFooter />
 *
 * Bypasses the global <Layout> on purpose: this page owns its own
 * header (with theme toggle) and footer, and we want the Constellation
 * to be the only ambient canvas (Layout would render a second one).
 * Wiring lives in App.tsx.
 */
import { useEffect } from "react";

import { B3H31DQuote } from "@/components/landing/B3H31DQuote";
import { Constellation } from "@/components/Constellation";
import { DaemonLocalSection } from "@/components/landing/DaemonLocalSection";
import { Hero } from "@/components/landing/Hero";
import { LandingTopbar } from "@/components/landing/LandingTopbar";
import { RealSessionsSection } from "@/components/landing/RealSessionsSection";
import {
  CTASection,
  CaptureCards,
  ClaimedVsDemonstrated,
  FAQ,
  HowItWorksSteps,
  LandingFooter,
  Manifesto,
  NotDoingList,
  RealScenes,
  VerificationChain,
} from "@/components/landing/sections";
import { useRevealMany } from "@/hooks/useReveal";

// Scoped landing-v5 stylesheet. Side-effect import: Vite bundles it
// into the chunk emitted for this route (and any other route that
// imports it). MeetB3/Compromisso/etc. never reach this file, so its
// `.landing-v5 …` selectors stay dormant.
import "@/styles/landing-v5.css";

export function Home() {
  // Observe every .reveal in the page once, so cascading delays
  // (d1..d4) play as sections enter the viewport. We could attach
  // useReveal per-component, but a single observer on the page root
  // keeps the implementation lean and easy to disable for reduced
  // motion (the hook already handles that).
  const rootRef = useRevealMany<HTMLDivElement>(".reveal", { threshold: 0.16 });

  useEffect(() => {
    // Make sure hero reveals fire even if they start in-view (the
    // observer fires on first observation regardless). No-op safety
    // net: poke any unhit ones after a tick.
    const t = window.setTimeout(() => {
      document.querySelectorAll(".landing-v5 .hero .reveal").forEach((el) => el.classList.add("in"));
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="landing-v5" ref={rootRef}>
      <Constellation />
      <LandingTopbar />
      <main className="wrap" id="top">
        <Hero />
        <Manifesto />
        <B3H31DQuote
          id="b3h31d-intro"
          quoteKey="landing.b3h31d.intro_quote"
          attrKey="landing.b3h31d.intro_quote_attr"
          variant="lead"
        />
        <CaptureCards />
        <DaemonLocalSection />
        <NotDoingList />
        <RealSessionsSection />
        <ClaimedVsDemonstrated />
        <HowItWorksSteps />
        <VerificationChain />
        <FAQ />
        <RealScenes />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
