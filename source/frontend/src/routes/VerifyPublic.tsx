import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { CompanyNav } from "@/components/company/CompanyNav";
import { SaveDevButton } from "@/components/company/SaveDevButton";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/i18n/I18nProvider";
import { fetchBundleWithAccount } from "@/lib/api";
import { verifyAttestation, type AttestationCheck } from "@/lib/attestationVerify";
import { fetchPlatformKeys } from "@/lib/platformKeys";
import type { Bundle } from "@/lib/types";
import { verifyBundle, type VerifyResult } from "@/lib/verify";

// Same renderer the CLI uses for `beheld snapshot --html`. The /v/:slug
// page on beheld.dev mirrors that local file 1-pra-1 by injecting the
// CLI's HTML output into an iframe (preserves <head>, embedded <style>,
// and the inline verification <script> that the design depends on).
//
// Module mirrored under `src/lib/cli-shared/` because the frontend
// container can't reach `packages/cli/` over the bind mount. Keep in sync
// with packages/cli/src/ui/snapshot-html.ts.
import { renderSnapshotHtml, type SnapshotHtmlData } from "@/lib/cli-shared/snapshot-html";

export function VerifyPublic() {
  const t = useT();
  const { id } = useParams<{ id: string }>();

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [attestation, setAttestation] = useState<AttestationCheck | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setBundle(null);
    setAccountId(null);
    setCompanyName(null);
    setError(null);
    setResult(null);
    setAttestation(null);
    setVerifying(true);

    (async () => {
      try {
        const { bundle: b, accountId: aid, companyName: cn } = await fetchBundleWithAccount(id);
        if (cancelled) return;
        setBundle(b);
        setAccountId(aid);
        setCompanyName(cn);
        const [r, keys] = await Promise.all([verifyBundle(b), fetchPlatformKeys()]);
        if (cancelled) return;
        setResult(r);
        const att = await verifyAttestation(b, keys);
        if (cancelled) return;
        setAttestation(att);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Suppress lint warnings — computed by verify hooks for future SPA interactions;
  // the CLI's HTML already runs its own client-side verification.
  void result; void verifying; void attestation;

  let content: React.ReactNode;
  if (!id) {
    content = <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}><ErrorBox title={t("verify.public.error.title")} message={t("verify.public.error.id_missing")} /></div>;
  } else if (error) {
    content = <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}><ErrorBox title={t("verify.public.error.title")} message={error} /></div>;
  } else if (!bundle) {
    content = (
      <div className="mx-auto space-y-3" style={{ maxWidth: 1032, padding: "0 32px" }}>
        <div className="h-8 w-72 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/60" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/40" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/40" />
      </div>
    );
  } else {
    content = (
      <>
        {accountId !== null && <FloatingSaveDev accountId={accountId} />}
        <SnapshotIframe bundle={bundle} />
      </>
    );
  }

  return (
    <div>
      <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
        {companyName ? (
          <CompanyHeader name={companyName} />
        ) : (
          <div className="pt-16">
            <SiteHeader />
          </div>
        )}
      </div>
      {content}
    </div>
  );
}

function CompanyHeader({ name }: { name: string }) {
  return (
    <header className="mb-10 pt-16">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        empresa · perfil
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        {name}
      </h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-3 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        <CompanyNav bare />
      </div>
    </header>
  );
}

// Save-dev chip — its own bordered card, pinned top-left of the portrait.
function FloatingSaveDev({ accountId }: { accountId: number }) {
  return (
    <div className="fixed z-50 flex items-center"
         style={{
           top: 20, left: 20,
           background: "var(--bg)",
           border: "1px solid var(--rule)",
           padding: "7px 14px",
         }}>
      <SaveDevButton accountId={accountId} variant="mono" label="+ salvar perfil" />
    </div>
  );
}

// Render the CLI's full HTML document inside an iframe. `srcDoc` keeps the
// document's <head>/<style>/<script> isolated from React's tree and lets
// Google Fonts + the inline verify script work exactly as in the local file.
//
// Theme sync: the SPA's ThemeToggle flips `html.dark` (and may set
// `data-theme="light|dark"`) on the parent document. We mirror that state
// onto the iframe's own <html> element via `data-theme`, which the CSS
// inside snapshot-html.ts listens for. A MutationObserver keeps the iframe
// in sync across toggle clicks without reloading the document.
function SnapshotIframe({ bundle }: { bundle: Bundle }) {
  const html = useMemo(() => buildSnapshotHtml(bundle), [bundle]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [innerHeight, setInnerHeight] = useState<number>(0);

  useEffect(() => {
    function effectiveTheme(): "light" | "dark" {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    function applyTheme() {
      const innerHtml = iframeRef.current?.contentDocument?.documentElement;
      if (!innerHtml) return;
      innerHtml.setAttribute("data-theme", effectiveTheme());
    }
    function measure() {
      const body = iframeRef.current?.contentDocument?.body;
      if (!body) return;
      // scrollHeight on the body gives the full rendered content height,
      // including margins. Add a tiny buffer so reflows on hover/focus
      // don't introduce a scrollbar.
      setInnerHeight(Math.max(body.scrollHeight, 0) + 4);
    }

    const iframe = iframeRef.current;
    function onLoad() {
      applyTheme();
      measure();
      // After the embedded fonts paint, layout shifts — re-measure once
      // the fonts are ready (Inter + Newsreader).
      iframe?.contentDocument?.fonts?.ready.then(measure).catch(() => {});
    }
    iframe?.addEventListener("load", onLoad);
    applyTheme();
    measure();

    // Reflect every parent theme change (auto → light, click toggle, etc.).
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes:      true,
      attributeFilter: ["class", "data-theme"],
    });

    // Resize the iframe whenever its content changes (verify toggle opens
    // a panel, theme flip re-renders the chip, etc.). ResizeObserver on
    // the inner <body> is the most reliable signal for srcDoc iframes.
    let resizeObserver: ResizeObserver | null = null;
    function attachResizeObserver() {
      const body = iframe?.contentDocument?.body;
      if (!body) return;
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(body);
    }
    iframe?.addEventListener("load", attachResizeObserver);
    attachResizeObserver();

    // Window resize affects wrap → also re-measure.
    window.addEventListener("resize", measure);

    return () => {
      iframe?.removeEventListener("load", onLoad);
      iframe?.removeEventListener("load", attachResizeObserver);
      themeObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [html]);

  // Constrain to the same column width Home/Dashboard use (max ~960px,
  // centered). The retrato's own `.page { max-width: 640px }` stays
  // centered inside this column — recruiters get the same visual rhythm
  // they see on landing/dashboard regardless of viewport width.
  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
      <iframe
        ref={iframeRef}
        title="beheld profile"
        srcDoc={html}
        sandbox="allow-scripts allow-popups allow-same-origin"
        style={{
          width:     "100%",
          // Height fits the rendered content (measured via ResizeObserver
          // on the iframe's body). Fall back to 100vh on first paint so
          // there's no zero-height flash before we measure.
          height:    innerHeight > 0 ? `${innerHeight}px` : "100vh",
          border:    0,
          display:   "block",
          // Transparent iframe so the SPA page background shows through —
          // the recruiter sees the snapshot floating on the cream/dark
          // canvas instead of inside an opaque card. The inner body bg is
          // also overridden to transparent (see buildSnapshotHtml).
          background: "transparent",
        }}
        scrolling="no"
      />
    </div>
  );
}

function buildSnapshotHtml(bundle: Bundle): string {
  // Pull the engine-produced sub-payloads the renderer needs. v5 bundles
  // embed signals/identity/emergent; older bundles fall back to safe defaults.
  const p = bundle.payload as unknown as {
    signals?: SnapshotHtmlData["signals"] | null;
    identity?: SnapshotHtmlData["identity"] | null;
    emergent?: SnapshotHtmlData["emergent"] | null;
  };
  const signals: SnapshotHtmlData["signals"] = p.signals ?? {};
  const identity: SnapshotHtmlData["identity"] = p.identity ?? {
    identity_long:  "Perfil em construção.",
    identity_short: "Perfil em construção.",
    confidence:      "low",
    generation_path: "fallback",
    model_used:      null,
  };
  const emergent: SnapshotHtmlData["emergent"] = p.emergent ?? null;
  // Match the CLI convention: `@<github_login>` when the bundle has an
  // attestation; otherwise let the renderer fall back to its own default.
  const login = bundle.attestation?.payload?.github?.login;
  const authorName = login ? `@${login}` : undefined;

  const html = renderSnapshotHtml({ bundle, signals, identity, emergent, authorName });

  // Strip the snapshot's opaque page background so the SPA's canvas
  // (cream in light, near-black in dark) shows through the iframe. We
  // override here instead of forking `cli-shared/snapshot-html.ts` so the
  // CLI's local `beheld snapshot --html` output keeps its own card-style
  // backdrop intact for offline viewing.
  return html.replace(
    "</head>",
    '<style id="beheld-portal-overrides">html,body{background:transparent !important}</style></head>',
  );
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-700/40 bg-rose-50 dark:bg-rose-950/30 p-6 text-rose-700 dark:text-rose-200">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-rose-600/80 dark:text-rose-300/80">{message}</div>
    </div>
  );
}
