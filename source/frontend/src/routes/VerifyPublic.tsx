/**
 * /v/:id — perfil público do dev, app-shell v2 (design_handoff_perfil).
 *
 * O momento de confiança do produto: sinais na frente, verificado vs
 * limitado marcado explicitamente, e o rodapé de verificação como prova
 * + pedagogia. Renders OUTSIDE <Layout>; shell público (`.app--public`,
 * SiteNav padrão das páginas públicas + CTA "criar minha conta →" no
 * nav__right). Tema claro/escuro via
 * data-theme-v2 (design_handoff_temas).
 *
 * Wiring (handoff "Data Sources & Wiring", adaptado à API real — não há
 * /api/profile/:handle; o permalink imutável é /v/:id, o equivalente do
 * /p/:bundle_id do handoff; todos os links do produto já apontam aqui):
 *   - bundle + accountId → GET /v/:id (fetchBundleWithAccount)
 *   - verificação criptográfica client-side (verifyBundle); tier do
 *     wrapper (computeTier) — assinatura/hash inválidos ⇒ unsigned
 *   - handle ← attestation GitHub (mesma resolução do renderer do CLI)
 *   - scores ← payload.scores; atributos ← payload.signals (v5+, com os
 *     MESMOS rótulos do CLI) com fallback em payload.l1/l2
 *   - expiração derivada de created_at + 30d (semântica do portal:
 *     "verificado ≤ 30 dias")
 *   - bio sintetizada SÓ de sinais observáveis (ecosistemas + sessões)
 *
 * SSR/OG ficam fora do escopo — o frontend é uma SPA Vite (handoff §SEO
 * documenta o desejo; depende de infra de pre-render).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { PublicFooter } from "@/components/PublicFooter";
import { SiteNav } from "@/components/SiteNav";
import { SaveDevButton } from "@/components/company/SaveDevButton";
import { useT, useTp, useFmt } from "@/i18n/I18nProvider";
import { fetchBundleWithAccount } from "@/lib/api";
import {
  ECO_LABEL, PLATFORM_LABEL, APPROACH_LABEL, PEAK_LABEL, WORKFLOW_LABEL,
  type SignalsPayload,
} from "@/lib/cli-shared/snapshot-html";
import { computeTier, type TrustTier } from "@/lib/cli-shared/tier";
import type { Bundle } from "@/lib/types";
import { verifyBundle } from "@/lib/verify";

import "@/styles/app-shell.css";
import "@/styles/app-profile.css";

// Semântica do portal: bundle "verificado" até 30 dias após a captura
// (mesmo corte do diretório e do status outdated no dashboard).
const TTL_DAYS = 30;

type Phase =
  | { kind: "loading" }
  | { kind: "notfound"; message: string }
  | { kind: "ready"; bundle: Bundle; accountId: number | null; tier: TrustTier };

export function VerifyPublic() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    document.documentElement.classList.add("app-v2-page");
    return () => document.documentElement.classList.remove("app-v2-page");
  }, []);

  useEffect(() => {
    if (!id) { setPhase({ kind: "notfound", message: t("verify.public.error.id_missing") }); return; }
    let cancelled = false;
    setPhase({ kind: "loading" });
    (async () => {
      try {
        const { bundle, accountId } = await fetchBundleWithAccount(id);
        if (cancelled) return;
        // Assinatura/hash inválidos ⇒ o bundle não é verificável: unsigned.
        const result = await verifyBundle(bundle);
        if (cancelled) return;
        const tier = result.ok ? computeTier(bundle) : "unsigned";
        setPhase({ kind: "ready", bundle, accountId, tier });
      } catch (e) {
        if (!cancelled) setPhase({ kind: "notfound", message: (e as Error).message });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const derived = useMemo(
    () => (phase.kind === "ready" ? deriveProfile(phase.bundle, phase.tier) : null),
    [phase],
  );

  // Página pública = artefato de share: ao menos o <title> reflete o perfil.
  useEffect(() => {
    if (!derived) return;
    const prev = document.title;
    document.title = `beheld · ${derived.handle}`;
    return () => { document.title = prev; };
  }, [derived]);

  return (
    <div className="app-v2 app--public">
      <a className="skip-link" href="#main">{t("landing.a11y.skip")}</a>
      <SiteNav
        extraRight={
          /* entry point do cadastro de empresa (design_handoff_cadastro_empresa) */
          <Link className="public-cta" to="/companies/new">{t("profile.cta_signup")} →</Link>
        }
      />
      <main className="app__main" id="main">
        <div className="wrap-inner">
          {phase.kind === "loading" && <ProfileSkeleton />}

          {phase.kind === "notfound" && (
            <div style={{ maxWidth: 640, padding: "48px 0" }}>
              <h1 style={{ fontFamily: "var(--mono)", fontSize: 28, letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>
                {t("profile.notfound.title")}
              </h1>
              <p style={{ color: "var(--ink-3)", fontSize: 14.5, marginTop: 12 }}>{phase.message}</p>
              <p style={{ marginTop: 18 }}>
                <Link to="/verify" style={{ color: "var(--signal-ink)", fontFamily: "var(--mono)", fontSize: 12.5, textDecoration: "none" }}>
                  {t("profile.notfound.other")} →
                </Link>
              </p>
            </div>
          )}

          {phase.kind === "ready" && derived && (
            <ProfileView d={derived} accountId={phase.accountId} bundleId={id!} />
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

// ── derivation: tudo a partir do bundle assinado ────────────────────────────

interface DerivedProfile {
  handle: string;
  attested: boolean;
  tier: TrustTier;
  createdAt: string;
  expiresIn: number;       // dias restantes (negativo = expirado)
  expired: boolean;
  repos: number;
  months: number;
  sessions: number | null;
  periodDays: number | null;
  scores: { overall: number | null; rows: Array<{ key: string; value: number | null }> };
  topEcos: string[];
  tools: string[];
  rhythm: string | null;
  workflow: string | null;
  testPattern: string | null;
}

function label(map: Record<string, string>, id: string): string {
  return map[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function topKeys(rec: Record<string, number> | undefined, n: number): string[] {
  if (!rec) return [];
  return Object.entries(rec)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function deriveProfile(bundle: Bundle, tier: TrustTier): DerivedProfile {
  const p = bundle.payload;
  // v5+ embute `signals` (mesma fonte dos rótulos do retrato do CLI);
  // bundles antigos caem nos agregados l1/l2.
  const signals = (p as unknown as { signals?: SignalsPayload | null }).signals ?? null;
  const login = bundle.attestation?.payload?.github?.login;
  const handle = login ? `@${login}` : "dev";

  const created = new Date(p.created_at).getTime();
  const ageDays = Number.isNaN(created) ? 0 : Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
  const expiresIn = TTL_DAYS - ageDays;

  const l1 = p.l1;
  const l2 = p.l2;
  const score = (v: number | undefined | null) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;

  const ecoIds = [
    ...(signals?.ecosystems?.dominant ?? []),
    ...(signals?.ecosystems?.secondary ?? []),
  ];
  const topEcos = (ecoIds.length > 0 ? ecoIds : topKeys(l2?.ecosystems, 3))
    .slice(0, 3)
    .map((id) => label(ECO_LABEL, id));

  // Padrão de teste: rótulo canônico do CLI quando presente; senão
  // heurística sobre workflow_metrics.
  let testPattern: string | null = signals?.test_pattern?.approach
    ? label(APPROACH_LABEL, signals.test_pattern.approach)
    : null;
  const wm = l2?.workflow_metrics;
  if (!testPattern && wm) {
    if (wm.test_first_ratio >= 0.25 && wm.test_first_ratio >= wm.test_after_ratio) testPattern = APPROACH_LABEL.tdd_partial;
    else if (wm.test_after_ratio >= 0.25) testPattern = APPROACH_LABEL.test_after;
    else if (wm.test_after_ratio > 0 || wm.test_first_ratio > 0) testPattern = APPROACH_LABEL.test_seldom;
  }

  return {
    handle,
    attested: Boolean(login),
    tier,
    createdAt: p.created_at,
    expiresIn,
    expired: expiresIn < 0,
    repos: l1?.total_repos ?? 0,
    months: l2?.period_days ? Math.max(1, Math.round(l2.period_days / 30)) : 1,
    sessions: l2?.sessions_analyzed ?? score(p.scores?.sessions_analyzed),
    periodDays: l2?.period_days ?? null,
    scores: {
      overall: score(p.scores?.overall),
      rows: [
        { key: "prompt_quality", value: score(p.scores?.prompt_quality) },
        { key: "test_maturity",  value: score(p.scores?.test_maturity) },
        { key: "tech_breadth",   value: score(p.scores?.tech_breadth) },
        { key: "growth_rate",    value: score(p.scores?.growth_rate) },
      ],
    },
    topEcos,
    tools: (signals?.tooling?.platforms ?? topKeys(l2?.platforms, 3))
      .slice(0, 3)
      .map((id) => label(PLATFORM_LABEL, id)),
    rhythm: signals?.timing?.peak_period ? label(PEAK_LABEL, signals.timing.peak_period) : null,
    workflow: topKeys(l2?.workflow_distribution, 1).map((id) => label(WORKFLOW_LABEL, id))[0] ?? null,
    testPattern,
  };
}

// ── view ────────────────────────────────────────────────────────────────────

function ProfileView({ d, accountId, bundleId }: {
  d: DerivedProfile;
  accountId: number | null;
  bundleId: string;
}) {
  const t = useT();
  const fmt = useFmt();
  const url = `${window.location.origin}/v/${bundleId}`;

  return (
    <>
      {d.expired && (
        <div className="profile-banner" role="status">
          <span className="ic" aria-hidden="true">⚠</span>
          <p style={{ margin: 0 }}>
            {t("profile.expired.banner", {
              date: fmt.date(d.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" }),
            })}
          </p>
        </div>
      )}

      <ProfileHero d={d} accountId={accountId} />

      <div className="profile-grid">
        <ScoresCard d={d} />
        <AttributesCard d={d} />
      </div>

      <StackCard d={d} />

      <VerificationFooter d={d} url={url} />
    </>
  );
}

// ── hero + tagpill ──────────────────────────────────────────────────────────

export function Tagpill({ variant, children }: { variant: "ok" | "warn" | "neutral"; children: ReactNode }) {
  return (
    <span className={`tagpill tagpill--${variant}`}>
      <span className="dot" aria-hidden="true" />
      {children}
    </span>
  );
}

const TIER_PILL: Record<TrustTier, { variant: "ok" | "warn"; key: string }> = {
  unsigned:          { variant: "warn", key: "profile.pill.unsigned" },
  signature_only:    { variant: "ok",   key: "profile.pill.signed" },
  chain_intact:      { variant: "ok",   key: "profile.pill.chain" },
  identity_verified: { variant: "ok",   key: "profile.pill.identity" },
  engine_verified:   { variant: "ok",   key: "profile.pill.engine" },
  fully_verifiable:  { variant: "ok",   key: "profile.pill.rekor" },
};

function ProfileHero({ d, accountId }: { d: DerivedProfile; accountId: number | null }) {
  const t = useT();
  const fmt = useFmt();
  const tierPill = TIER_PILL[d.tier];
  const name = d.handle.replace(/^@/, "");

  return (
    <header className="profile-hero">
      <div>
        <p className="profile-hero__eb">
          <span>{t("profile.crumb")}</span>
          <span className="sl">/</span>
          <span className="you">{d.handle}</span>
        </p>
        <h1 className="profile-hero__handle">
          <span>
            {d.attested && <span className="at">@</span>}
            {name}
          </span>
          <span className="profile-hero__pills">
            {d.expired ? (
              <Tagpill variant="neutral">✗ {t("profile.pill.expired")}</Tagpill>
            ) : (
              <Tagpill variant={tierPill.variant}>{t(tierPill.key)}</Tagpill>
            )}
            {d.repos > 0 && <Tagpill variant="neutral">{d.repos} repos</Tagpill>}
          </span>
        </h1>
        <p className="profile-hero__date">
          {t("profile.captured")} <b>{fmt.date(d.createdAt, { day: "numeric", month: "long", year: "numeric" })}</b>
        </p>
        {d.topEcos.length > 0 && (
          <p className="profile-hero__bio">
            {t("profile.bio.works_with")}{" "}
            {d.topEcos.map((eco, i) => (
              <span key={eco}>
                {i > 0 && (i === d.topEcos.length - 1 ? ` ${t("profile.bio.and")} ` : ", ")}
                <b>{eco}</b>
              </span>
            ))}
            {d.sessions != null && d.periodDays != null
              ? <> {t("profile.bio.sessions", { sessions: d.sessions, days: d.periodDays })}</>
              : "."}
          </p>
        )}
      </div>

      <div className="profile-hero__actions">
        <span className="meta">
          {d.expired
            ? <>{t("profile.expires.label")} <b>{t("profile.expires.expired")}</b></>
            : <>{t("profile.expires.label")} <b>{t("profile.expires.days", { days: d.expiresIn })}</b></>}
        </span>
        {accountId !== null && !d.expired && <SaveDevButton accountId={accountId} />}
      </div>
    </header>
  );
}

// ── scores ──────────────────────────────────────────────────────────────────

function scoreTone(v: number | null): "ok" | "warn" | "none" | "" {
  if (v == null) return "none";
  if (v >= 70) return "ok";
  if (v < 40) return "warn";
  return "";
}

function ScoresCard({ d }: { d: DerivedProfile }) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const [filled, setFilled] = useState(false);

  // Barras preenchem na entrada do viewport (decorativas — aria-hidden).
  // Sob prefers-reduced-motion (ou sem IO, ex.: jsdom) preenchem direto.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFilled(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setFilled(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="pcard scores" ref={ref}>
      <div className="pcard__h">
        <h2>{t("profile.scores.title")}</h2>
        <span className="meta">{t("profile.scores.meta")}</span>
      </div>
      <div className="scores__big">
        <span className="v">
          {d.scores.overall ?? "—"}
          <span className="denom">/100</span>
        </span>
        <span className="lab">
          {t("profile.scores.overall")}
          <b>{t("profile.scores.overall_caption")}</b>
        </span>
      </div>
      {d.scores.rows.map((row) => {
        const tone = scoreTone(row.value);
        return (
          <div key={row.key} className="scorerow">
            <span className="lab">{t(`profile.scores.${row.key}`)}</span>
            <span className="track" aria-hidden="true">
              <span className={`fill ${tone}`.trim()}
                    style={{ width: filled ? `${row.value == null ? 100 : row.value}%` : 0 }} />
            </span>
            <span className={`val ${tone}`.trim()}>{row.value ?? "—"}</span>
          </div>
        );
      })}
    </section>
  );
}

// ── perfil técnico ──────────────────────────────────────────────────────────

function Attr({ label: lab, value, mono = false, big = false, full = false }: {
  label: string;
  value: string | null;
  mono?: boolean;
  big?: boolean;
  full?: boolean;
}) {
  const t = useT();
  const cls = [big ? "big" : null, mono ? "mono" : null, value == null ? "empty" : null]
    .filter(Boolean).join(" ");
  return (
    <div className={full ? "full" : undefined}>
      <dt>{lab}</dt>
      <dd className={cls || undefined}>
        {value ?? (<><span className="visually-hidden">{t("profile.attrs.no_data")}</span>—</>)}
      </dd>
    </div>
  );
}

function AttributesCard({ d }: { d: DerivedProfile }) {
  const t = useT();
  const join = (xs: string[]) => (xs.length > 0 ? xs.join(" · ") : null);
  return (
    <section className="pcard attrs">
      <div className="pcard__h">
        <h2>{t("profile.attrs.title")}</h2>
        <span className="meta">{t("profile.attrs.meta")}</span>
      </div>
      {/* nunca esconda um campo vazio — "—" é dado ("não vimos isso") */}
      <dl className="attrs__b">
        <Attr label={t("profile.attrs.languages")} value={join(d.topEcos)} mono />
        <Attr label={t("profile.attrs.rhythm")} value={d.rhythm} />
        <Attr label={t("profile.attrs.test_pattern")} value={d.testPattern} />
        <Attr label={t("profile.attrs.tools")} value={d.tools.length > 0 ? d.tools.join(", ") : null} mono />
        <Attr label={t("profile.attrs.platforms")} value={null} mono />
        <Attr label={t("profile.attrs.workflow")} value={d.workflow} />
        <Attr label={t("profile.attrs.sessions")} value={d.sessions != null ? String(d.sessions) : null} big full />
      </dl>
    </section>
  );
}

// ── stack ───────────────────────────────────────────────────────────────────

function StackCard({ d }: { d: DerivedProfile }) {
  const t = useT();
  return (
    <section className="pcard stack">
      <div className="pcard__h">
        <h2>{t("profile.stack.title")}</h2>
        <span className="meta">{t("profile.stack.meta")}</span>
      </div>
      <div className="stack__b">
        {d.repos === 0 ? (
          <div className="stack__empty">
            <span className="ic" aria-hidden="true">{"{ }"}</span>
            <p className="t">
              {t("profile.stack.empty_prefix")}<code>/beheld import</code>{t("profile.stack.empty_suffix")}
            </p>
          </div>
        ) : (
          <div className="stack__facts">
            <span><b>{d.repos}</b> {t("profile.stack.repos")}</span>
            {d.topEcos.length > 0 && (
              <span className="chips">
                {d.topEcos.map((eco) => <span key={eco}>{eco}</span>)}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── verificação ─────────────────────────────────────────────────────────────

const TIER_VERIFY: Record<TrustTier, { tone: "ok" | "warn"; titleKey: string; bodyKey: string }> = {
  unsigned:          { tone: "warn", titleKey: "profile.verify.unsigned.title",  bodyKey: "profile.verify.unsigned.body" },
  signature_only:    { tone: "warn", titleKey: "profile.verify.signature.title", bodyKey: "profile.verify.signature.body" },
  chain_intact:      { tone: "ok",   titleKey: "profile.verify.chain.title",     bodyKey: "profile.verify.chain.body" },
  identity_verified: { tone: "ok",   titleKey: "profile.verify.identity.title",  bodyKey: "profile.verify.identity.body" },
  engine_verified:   { tone: "ok",   titleKey: "profile.verify.engine.title",    bodyKey: "profile.verify.engine.body" },
  fully_verifiable:  { tone: "ok",   titleKey: "profile.verify.rekor.title",     bodyKey: "profile.verify.rekor.body" },
};

function VerificationFooter({ d, url }: { d: DerivedProfile; url: string }) {
  const t = useT();
  const tp = useTp();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const row = TIER_VERIFY[d.tier];

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="pcard verify-foot">
      <div className="pcard__h">
        <h2>{t("profile.verify.title")}</h2>
        <span className="meta">{t("profile.verify.meta")}</span>
      </div>

      <div className="verify-rows">
        <div className="vrow2">
          <span className={`ck ${row.tone}`} aria-hidden="true">{row.tone === "ok" ? "✓" : "⚠"}</span>
          <div>
            <p className="t">{t(row.titleKey)}</p>
            <p className="d">{t(row.bodyKey)}</p>
          </div>
        </div>
        <div className="vrow2">
          <span className="ck ok" aria-hidden="true">✓</span>
          <div>
            <p className="t">{t("profile.verify.capture.title")}</p>
            <p className="d">
              {t("profile.verify.capture.body_prefix")}
              <b>{tp("profile.verify.capture.repos", d.repos)}</b>
              {t("profile.verify.capture.body_mid")}
              <b>{tp("profile.verify.capture.months", d.months)}</b>
              {t("profile.verify.capture.body_suffix")}{" "}
              <b>{t("profile.verify.capture.not_self")}</b>
            </p>
          </div>
        </div>
      </div>

      <div className="verify-foot__bottom">
        <span className="url">
          <b>{url.replace(/^https?:\/\//, "")}</b>
          <button type="button" className={`copy${copied ? " copied" : ""}`}
                  onClick={copy} disabled={d.expired} aria-live="polite">
            {copied ? t("profile.verify.copied") : t("profile.verify.copy")}
          </button>
        </span>
        <span className="expires">
          {d.expired ? (
            <>
              <span className="dot" aria-hidden="true" />
              <b>{t("profile.expires.expired")}</b>
            </>
          ) : (
            <>
              <span className="dot" aria-hidden="true" />
              {t("profile.expires.label")} <b>{t("profile.expires.days", { days: d.expiresIn })}</b>
            </>
          )}
        </span>
      </div>
    </section>
  );
}

// ── skeleton (estado E) ─────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="profile-skel" aria-hidden="true">
      <div className="blk" style={{ height: 120 }} />
      <div className="profile-grid">
        <div className="blk" style={{ height: 320 }} />
        <div className="blk" style={{ height: 320 }} />
      </div>
      {/* rodapé de verificação como UM bloco mudo — sem verde/âmbar enganoso */}
      <div className="blk" style={{ height: 140 }} />
    </div>
  );
}
