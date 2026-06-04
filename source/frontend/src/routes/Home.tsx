/**
 * Home — landing v5.
 *
 * Layout (single page, owns its own header/footer/Constellation —
 * see App.tsx for the routing carve-out):
 *
 *   .landing-v5
 *     <Constellation />                    (ambient bg, portal'd)
 *     <LandingTopbar />                    (LensMark + nav + toggles)
 *     <main class="wrap" id="top">
 *       <Hero />                           (always visible above the
 *                                           4 tabs)
 *       <LandingTabs panels={...}>         (4 tabs, fixed order)
 *         01 Manifesto:   Manifesto + B3Quote(intro) + RealScenes
 *         02 Daemon:      CaptureCards + DaemonLocalSection (which
 *                         includes its own closing B3Quote and
 *                         flow/never-table) + HowItWorksSteps
 *         03 Sessões:     RealSessionsSection (includes the session
 *                         example block + closing B3Quote) +
 *                         ClaimedVsDemonstrated
 *         04 Verificação: NotDoingList + VerificationChain + FAQ
 *       </LandingTabs>
 *       <CTASection />                     (always visible below)
 *     </main>
 *     <LandingFooter />
 *
 * Hero, CTA and footer are intentionally OUTSIDE the tabs — they
 * frame the page and stay visible whichever tab is active.
 *
 * Reveals: the page-level useRevealMany still observes everything,
 * but tab panels that are `hidden` won't intersect, so LandingTabs
 * also force-applies `.in` to all `.reveal` descendants when a panel
 * activates (see LandingTabs.tsx).
 */
import { useEffect } from "react";

import { B3H31DQuote } from "@/components/landing/B3H31DQuote";
import { CompromissoSection } from "@/components/landing/CompromissoSection";
import { Constellation } from "@/components/Constellation";
import { DaemonLocalSection } from "@/components/landing/DaemonLocalSection";
import { Hero } from "@/components/landing/Hero";
import { LandingTabs, type PanelId } from "@/components/landing/LandingTabs";
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
  const rootRef = useRevealMany<HTMLDivElement>(".reveal", { threshold: 0.16 });

  useEffect(() => {
    const t = window.setTimeout(() => {
      document.querySelectorAll(".landing-v5 .hero .reveal").forEach((el) => el.classList.add("in"));
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  const panels: Record<PanelId, React.ReactNode> = {
    manifesto: (
      <>
        <Manifesto />
        <B3H31DQuote
          id="b3h31d-intro"
          quoteKey="landing.b3h31d.intro_quote"
          attrKey="landing.b3h31d.intro_quote_attr"
        />
        <RealScenes />
      </>
    ),
    daemon: (
      <>
        <CaptureCards />
        <DaemonLocalSection />
        <HowItWorksSteps />
      </>
    ),
    sessoes: (
      <>
        <RealSessionsSection />
        <ClaimedVsDemonstrated />
      </>
    ),
    verificacao: (
      <>
        <NotDoingList />
        <VerificationChain />
        <FAQ />
      </>
    ),
    compromisso: <CompromissoSection />,
  };

  return (
    <div className="landing-v5" ref={rootRef}>
      <Constellation />
      <LandingTopbar />
      <main className="wrap" id="top">
        <Hero />
        <LandingTabs panels={panels} />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
