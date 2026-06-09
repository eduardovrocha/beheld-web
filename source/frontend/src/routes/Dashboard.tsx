/**
 * Dashboard SPA route (`/dashboard`) — developer dashboard, app-shell v2.
 *
 * Visual: design_handoff_dev (cripto-brutalist refinado · terminal-native).
 * Dark-only app shell: sticky TopBar + 248px Sidebar + main column
 * (max 1320px). Tokens/styles live in styles/app-shell.css, scoped under
 * `.app-v2`. Renders OUTSIDE <Layout> — owns its own chrome (see App.tsx).
 *
 * Auth: Bearer token from `?session=<...>` (issued by `beheld auth`)
 * persisted in sessionStorage; subsequent requests stay authenticated.
 *
 * Views (sidebar, URL-hash synced so deep links work):
 *   #visao-geral (overview) · #mensagens · #configuracoes
 * Overview sub-tabs (in-page switchers): Resumo · Publicações · Verificações.
 *
 * Wiring ("Data Sources & Wiring" do handoff, adaptado à API real): tudo
 * vem de GET /api/v1/dashboard (payload único) — handle/fingerprint
 * (account), bundles, contato (account.contact_configured), mensagens,
 * evolução (curva derivada de bundles[].published_at no cliente) e a
 * cadeia de verificação (derivada: tier sobe pra chain_intact com ≥ 2
 * bundles ativos; camadas 3–5 ficam `off` até existir backend pra elas).
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { EvolutionChart } from "@/components/app/EvolutionChart";
import { PageHeader, ShellButton, CheckIcon, UpArrowIcon } from "@/components/app/PageHeader";
import { Panel, PanelHeader } from "@/components/app/Panel";
import { Sidebar, SideFoot, SideItem, SideSection, GridIcon, EnvelopeIcon, GearIcon, DocIcon, PlusIcon } from "@/components/app/Sidebar";
import { StatCard, StatPill, StatsRow } from "@/components/app/StatCard";
import { SubTabs } from "@/components/app/SubTabs";
import { TierLadder, LADDER_TIERS } from "@/components/app/TierLadder";
import { TopBar } from "@/components/app/TopBar";
import { VerificationChain, type VerificationLayer } from "@/components/app/VerificationChain";
import { DevTopActions } from "@/components/dev/DevTopActions";
import { useT, useTp, useFmt } from "@/i18n/I18nProvider";
import type { Formatters } from "@/i18n/format";
import type { TrustTier } from "@/lib/cli-shared/tier";
import { docsCliUrl } from "@/lib/docsUrl";
import {
  clearSessionToken,
  getDashboard,
  revokeBundle,
  setSessionToken,
  toggleBundle,
  updateSettings,
  DashboardAuthError,
  type DashboardPayload,
  type DashboardBundle,
  type DashboardMessage,
  type DashboardNotification,
} from "@/lib/dashboardApi";

// Scoped app-shell stylesheet. Side-effect import: Vite bundles it into
// the chunk emitted for this route; `.app-v2 …` selectors stay dormant
// elsewhere.
import "@/styles/app-shell.css";

// ── format helpers ──────────────────────────────────────────────────────────

function formatDate(fmt: Formatters, iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : fmt.date(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** `511ac8da…d8e1` — fingerprint curto pra evidências. */
function shortKey(fp: string): string {
  return fp.length > 12 ? `${fp.slice(0, 4)}…${fp.slice(-4)}` : fp;
}

// ── views (sidebar) ─────────────────────────────────────────────────────────

type ViewId = "overview" | "messages" | "settings";
type OverviewSubId = "summary" | "bundles" | "verifications";

const VIEW_HASH: Record<ViewId, string> = {
  overview: "#visao-geral",
  messages: "#mensagens",
  settings: "#configuracoes",
};

function viewFromHash(hash: string): ViewId {
  const found = (Object.keys(VIEW_HASH) as ViewId[]).find((id) => VIEW_HASH[id] === hash);
  return found ?? "overview";
}

// ── route ───────────────────────────────────────────────────────────────────

export function Dashboard() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData]   = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  const [view, setView] = useState<ViewId>(() => viewFromHash(window.location.hash));
  const [overviewSub, setOverviewSub] = useState<OverviewSubId>("summary");

  // Neutralise the global (themed) chrome while the shell is mounted.
  useEffect(() => {
    document.documentElement.classList.add("app-v2-page");
    return () => document.documentElement.classList.remove("app-v2-page");
  }, []);

  useEffect(() => {
    function onHash() { setView(viewFromHash(window.location.hash)); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function selectView(id: ViewId) {
    setView(id);
    history.replaceState(null, "", VIEW_HASH[id]);
  }

  // Pick up `?session=<token>` and clean the URL.
  useEffect(() => {
    const fromUrl = params.get("session");
    if (fromUrl) {
      setSessionToken(fromUrl);
      params.delete("session");
      navigate({ pathname: "/dashboard", search: params.toString() }, { replace: true });
    }
  }, [params, navigate]);

  // Initial fetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await getDashboard();
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function refresh(op: () => Promise<DashboardPayload>) {
    setBusy(true);
    try {
      setData(await op());
    } catch (e) {
      if (e instanceof DashboardAuthError) { setData(null); setError(e.message); }
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearSessionToken();
    navigate("/", { replace: true });
  }

  // ── derived state (gramática de sinal) ────────────────────────────────────

  const account = data?.account ?? null;
  const handle = account ? `@${account.handle.replace(/^@/, "")}` : "@—";
  const bundles = data?.bundles ?? [];
  const messages = data?.messages ?? [];
  const notifications = data?.notifications ?? [];

  const activeBundles = useMemo(() => bundles.filter((b) => b.status !== "revoked"), [bundles]);
  const visibleCount = activeBundles.filter((b) => b.visible).length;

  // Tier derivado no cliente (v1): assinatura local sempre presente;
  // com ≥ 2 bundles ativos a cadeia (previous_hash) existe. Camadas 3–5
  // dependem de evidências que a API ainda não expõe.
  const tier: TrustTier = activeBundles.length >= 2 ? "chain_intact" : "signature_only";
  const tiersPassed = LADDER_TIERS.indexOf(tier as (typeof LADDER_TIERS)[number]) + 1;

  const layers: VerificationLayer[] = account ? [
    {
      token: "signature_only",
      title: t("dashboard.chain.signature.title"),
      description: t("dashboard.chain.signature.desc"),
      evidence: `${t("dashboard.chain.signature.ev_label")} ${shortKey(account.fingerprint)}`,
      state: "verified",
    },
    {
      token: "chain_intact",
      title: t("dashboard.chain.chain.title"),
      description: activeBundles.length >= 2
        ? t("dashboard.chain.chain.desc_ok")
        : t("dashboard.chain.chain.desc_pending"),
      evidence: activeBundles.length >= 2
        ? `${activeBundles.length} bundles`
        : t("dashboard.chain.chain.ev_pending"),
      state: activeBundles.length >= 2 ? "verified" : "pending",
    },
    {
      token: "identity_verified",
      title: t("dashboard.chain.identity.title"),
      description: t("dashboard.chain.identity.desc"),
      evidence: t("dashboard.chain.identity.ev_off"),
      state: "off",
    },
    {
      token: "engine_verified",
      title: t("dashboard.chain.engine.title"),
      description: t("dashboard.chain.engine.desc"),
      evidence: "—",
      state: "off",
    },
    {
      token: "fully_verifiable",
      title: t("dashboard.chain.rekor.title"),
      description: t("dashboard.chain.rekor.desc"),
      evidence: t("dashboard.chain.rekor.ev_off"),
      state: "off",
    },
  ] : [];

  // ── shell chrome (always rendered, even in loading/error) ─────────────────

  const daysSince = data?.evolution.days_since_last ?? null;
  const sidebar = (
    <Sidebar>
      <SideItem icon={GridIcon} active={view === "overview"} onSelect={() => selectView("overview")}>
        {t("dashboard.tab.overview.label")}
      </SideItem>
      <SideItem icon={EnvelopeIcon} active={view === "messages"} badge={messages.length}
                onSelect={() => selectView("messages")}>
        {t("dashboard.tab.messages.label")}
      </SideItem>
      <SideItem icon={GearIcon} active={view === "settings"} onSelect={() => selectView("settings")}>
        {t("dashboard.tab.settings.label")}
      </SideItem>

      <SideSection label={t("dashboard.side.resources")} />
      <SideItem icon={DocIcon} to={docsCliUrl()}>{t("dashboard.side.docs")}</SideItem>
      <SideItem icon={PlusIcon} href="mailto:hi@beheld.dev">{t("dashboard.side.support")}</SideItem>

      <SideFoot>
        <b>{t("dashboard.side.foot.account")}</b><br />
        ed25519<br />
        {daysSince != null ? (
          <><span style={{ color: "var(--signal-ink)" }}>●</span> {t("dashboard.side.foot.sync", { days: daysSince })}</>
        ) : (
          <><span aria-hidden="true">○</span> {t("dashboard.side.foot.no_sync")}</>
        )}
        <br />
        <button type="button" className="signout" onClick={signOut}>
          {t("dashboard.footer.sign_out")}
        </button>
      </SideFoot>
    </Sidebar>
  );

  const shell = (children: ReactNode) => (
    <AppShell topBar={<TopBar crumb={["dashboard", handle]} right={<DevTopActions handle={handle} tier={tier} onSignOut={signOut} />} />} sidebar={sidebar}>
      {children}
    </AppShell>
  );

  if (error) {
    return shell(
      <>
        <PageHeader eyebrow={["dashboard"]} title={t("dashboard.h1")}
                    subtitle={t("dashboard.error.subtitle")} />
        <Panel header={<PanelHeader title={t("dashboard.error.subtitle")} />}>
          <p style={{ color: "var(--ink-3)", fontSize: 13.5, lineHeight: 1.7 }}>{error}</p>
          <p style={{ color: "var(--ink-3)", fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
            {t("dashboard.error.auth_hint_prefix")}
            <code className="mono" style={{ color: "var(--signal-ink)" }}>beheld auth</code>
            {t("dashboard.error.auth_hint_suffix")}
          </p>
        </Panel>
      </>,
    );
  }

  if (!data || !account) {
    return shell(<p className="app__loading">{t("dashboard.loading")}</p>);
  }

  return shell(
    <>
      <PageHeader
        eyebrow={["dashboard", handle]}
        title={t("dashboard.h1")}
        subtitle={t("dashboard.page.sub")}
        fingerprint={account.fingerprint}
        cta={view === "overview" ? (
          <>
            <ShellButton icon={CheckIcon} disabled={busy} onClick={() => refresh(getDashboard)}>
              {t("dashboard.cta.refresh")}
            </ShellButton>
            <ShellButton icon={UpArrowIcon} primary
                         onClick={() => { setOverviewSub("bundles"); selectView("overview"); }}>
              {t("dashboard.cta.publish")}
            </ShellButton>
          </>
        ) : undefined}
      />

      {view === "overview" && (
        <>
          <SubTabs<OverviewSubId>
            tabs={[
              { id: "summary",       label: t("dashboard.overview.subtab.summary.label") },
              { id: "bundles",       label: t("dashboard.tab.bundles.label"),       n: String(activeBundles.length) },
              { id: "verifications", label: t("dashboard.tab.verifications.label"), n: `${tiersPassed}/5` },
            ]}
            active={overviewSub}
            onSelect={setOverviewSub}
          />

          {overviewSub === "summary" && (
            <SummaryView data={data} activeBundles={activeBundles} tier={tier} tiersPassed={tiersPassed}
                         onSeeBundles={() => setOverviewSub("bundles")}
                         onSeeTiers={() => setOverviewSub("verifications")}
                         onConfigure={() => selectView("settings")} />
          )}

          {overviewSub === "bundles" && (
            <PublicationsPanel bundles={bundles} visibleCount={visibleCount} busy={busy}
                               onToggle={(id) => refresh(() => toggleBundle(id))}
                               onRevoke={(id) => {
                                 if (!confirm(t("dashboard.bundles.revoke_confirm"))) return;
                                 refresh(() => revokeBundle(id));
                               }} />
          )}

          {overviewSub === "verifications" && (
            <>
              <Panel flush
                     style={{ paddingTop: 0, paddingBottom: 0 }}
                     header={<PanelHeader title={t("dashboard.tab.verifications.label")}
                                          meta={t("dashboard.vchain.meta", { active: tiersPassed })}
                                          right={<span className="meta">tier · {tier}</span>} />}>
                <VerificationChain layers={layers} />
              </Panel>
              <ReceivedVerifications notifications={notifications} />
            </>
          )}
        </>
      )}

      {view === "messages" && <MessagesView messages={messages} />}

      {view === "settings" && (
        <Panel style={{ paddingTop: 0, paddingBottom: 0 }}
               header={<PanelHeader title={t("dashboard.tab.settings.label")}
                                    meta={t("dashboard.tab.settings.subtitle")} />}>
          <SettingsForm account={account} busy={busy}
                        onSubmit={(patch) => refresh(() => updateSettings(patch))} />
        </Panel>
      )}
    </>,
  );
}

// ── Resumo: stat cards + evolução + tier ladder ─────────────────────────────

function SummaryView({ data, activeBundles, tier, tiersPassed, onSeeBundles, onSeeTiers, onConfigure }: {
  data: DashboardPayload;
  activeBundles: DashboardBundle[];
  tier: TrustTier;
  tiersPassed: number;
  onSeeBundles: () => void;
  onSeeTiers: () => void;
  onConfigure: () => void;
}) {
  const t = useT();
  const count = activeBundles.length;
  const contact = data.account.contact_configured;
  const days = data.evolution.days_since_last;

  return (
    <>
      {data.interest.companies > 0 && <InterestStrip companies={data.interest.companies} />}

      <StatsRow>
        {/* bundles */}
        <StatCard
          kicker={t("dashboard.stat.bundles.kicker")}
          pill={count === 0
            ? <StatPill variant="empty">{t("dashboard.stat.bundles.pill_empty")}</StatPill>
            : <StatPill variant="ok">{t("dashboard.stat.bundles.pill_ok")}</StatPill>}
          value={count}
          valueTone={count === 0 ? "dim" : undefined}
          description={count === 0
            ? t("dashboard.stat.bundles.desc_empty")
            : days != null
              ? t("dashboard.stat.bundles.desc_ok", { days })
              : t("dashboard.stat.bundles.desc_ok_nodate")}
          foot={count === 0 ? (
            <>
              <span className="pmt" aria-hidden="true">$</span>
              <span className="mono">beheld snapshot --publish</span>
            </>
          ) : (
            <button type="button" onClick={onSeeBundles}>{t("dashboard.stat.bundles.foot_ok")}</button>
          )}
        />

        {/* contato */}
        <StatCard
          kicker={t("dashboard.stat.contact.kicker")}
          pill={contact
            ? <StatPill variant="ok">✓ {t("dashboard.stat.contact.pill_ok")}</StatPill>
            : <StatPill variant="empty">{t("dashboard.stat.contact.pill_empty")}</StatPill>}
          value={contact ? t("dashboard.stat.contact.value_ok") : t("dashboard.stat.contact.value_empty")}
          valueTone={contact ? "ok" : "dim"}
          phrase
          description={contact ? (
            <><span className="ok">{t("dashboard.stat.contact.desc_ok_lead")}</span> {t("dashboard.stat.contact.desc_ok")}</>
          ) : t("dashboard.stat.contact.desc_empty")}
          foot={<button type="button" onClick={onConfigure}>
            {contact ? t("dashboard.stat.contact.foot_ok") : t("dashboard.stat.contact.foot_empty")}
          </button>}
        />

        {/* tier */}
        <StatCard
          kicker={t("dashboard.stat.tier.kicker")}
          pill={tier === "fully_verifiable"
            ? <StatPill variant="ok">{t("dashboard.stat.tier.pill_max")}</StatPill>
            : <StatPill variant="warn">⚠ {t("dashboard.stat.tier.pill_warn")}</StatPill>}
          value={tier}
          valueTone={tier === "fully_verifiable" ? "ok" : undefined}
          phrase
          description={<>
            {t("dashboard.stat.tier.desc_prefix")}
            <span className="warn">{t("dashboard.stat.tier.desc_warn")}</span>
            {t("dashboard.stat.tier.desc_suffix")}
          </>}
          foot={<button type="button" onClick={onSeeTiers}>{t("dashboard.stat.tier.foot")}</button>}
        />
      </StatsRow>

      <div className="row2">
        <Panel header={<PanelHeader title={t("dashboard.evo.title")}
                                    meta={t("dashboard.evo.meta")}
                                    right={<span className="meta">{t("dashboard.evo.axes")}</span>} />}>
          <EvolutionChart publishedAt={activeBundles.map((b) => b.published_at)} />
        </Panel>

        <Panel flush
               header={<PanelHeader title={t("dashboard.ladder.title")}
                                    meta={t("dashboard.ladder.meta", { passed: tiersPassed })}
                                    right={<button type="button" className="lnk" onClick={onSeeTiers}>
                                      {t("dashboard.ladder.how")}
                                    </button>} />}>
          <TierLadder current={tier} />
        </Panel>
      </div>
    </>
  );
}

// P21: contagem anônima de interesse — uma linha, sem metadados. Some
// quando 0 (dashboard quieto quando não há nada a comunicar).
function InterestStrip({ companies }: { companies: number }) {
  const t = useT();
  const tp = useTp();
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 14,
      border: "1px solid var(--line)", borderLeft: "2px solid var(--signal)",
      background: "var(--surface)", padding: "13px 18px", marginBottom: 24,
    }}>
      <span className="mono" style={{ color: "var(--signal-ink)", fontSize: 22, fontWeight: 600, lineHeight: 1 }}>
        {companies}
      </span>
      <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
        {tp("dashboard.overview.interest", companies)}
        {" "}
        <span className="mono" style={{ color: "var(--ink-4)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          · {t("dashboard.overview.interest.note")}
        </span>
      </span>
    </div>
  );
}

// ── Publicações ──────────────────────────────────────────────────────────────

function PublicationsPanel({ bundles, visibleCount, busy, onToggle, onRevoke }: {
  bundles: DashboardBundle[];
  visibleCount: number;
  busy: boolean;
  onToggle: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  const t = useT();
  return (
    <Panel flush={bundles.length > 0}
           style={{ paddingTop: 0, paddingBottom: 0 }}
           header={<PanelHeader title={t("dashboard.tab.bundles.label")}
                                meta={t("dashboard.pubs.meta", { count: bundles.length, urls: visibleCount })}
                                right={<span className="meta">{t("dashboard.pubs.revocable")}</span>} />}>
      {bundles.length === 0 ? (
        <EmptyState
          title={t("dashboard.pubs.empty_title")}
          description={t("dashboard.pubs.empty_desc")}
          command="beheld snapshot --publish"
        />
      ) : (
        <div className="pubs">
          {bundles.map((b) => (
            <PublicationRow key={b.id} bundle={b} busy={busy}
                            onToggle={() => onToggle(b.id)} onRevoke={() => onRevoke(b.id)} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function PublicationRow({ bundle, busy, onToggle, onRevoke }: {
  bundle: DashboardBundle; busy: boolean;
  onToggle: () => void; onRevoke: () => void;
}) {
  const t = useT();
  const tp = useTp();
  const fmt = useFmt();
  const url = `${window.location.origin}/v/${bundle.url_slug}`;
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const statusPill = bundle.status === "verified"
    ? <StatPill variant="ok">✓ {t("common.bundle_status.verified")}</StatPill>
    : bundle.status === "outdated"
      ? <StatPill variant="warn">{t("common.bundle_status.outdated")}</StatPill>
      : <StatPill variant="empty">{t("common.bundle_status.revoked")}</StatPill>;

  return (
    <div className="pub">
      <div>
        <p className="pub__id">
          <a href={url} target="_blank" rel="noreferrer">beheld.dev/v/{bundle.url_slug}</a>
          {statusPill}
          {!bundle.visible && <StatPill variant="empty">{t("dashboard.bundles.hidden")}</StatPill>}
        </p>
        <p className="pub__meta">
          {formatDate(fmt, bundle.published_at)}
          {" · "}{bundle.verifications_count} {tp("dashboard.bundles.verifications", bundle.verifications_count)}
        </p>
      </div>
      <div className="pub__acts">
        <button type="button" onClick={copyUrl} aria-live="polite">
          {copied ? t("dashboard.fp.copied") : t("dashboard.pubs.copy_url")}
        </button>
        <span className="sep" aria-hidden="true">|</span>
        <button type="button" disabled={busy} onClick={onToggle}>
          {bundle.visible ? t("dashboard.bundles.hide") : t("dashboard.bundles.show")}
        </button>
        <span className="sep" aria-hidden="true">|</span>
        <button type="button" className="warn" disabled={busy || bundle.status === "revoked"} onClick={onRevoke}>
          {t("dashboard.bundles.revoke")}
        </button>
      </div>
    </div>
  );
}

// ── Verificações recebidas (empresas que abriram o retrato) ─────────────────

function ReceivedVerifications({ notifications }: { notifications: DashboardNotification[] }) {
  const t = useT();
  const fmt = useFmt();
  return (
    <Panel flush={notifications.length > 0}
           style={{ paddingTop: 0, paddingBottom: 0 }}
           header={<PanelHeader title={t("dashboard.received.title")}
                                meta={t("dashboard.received.meta", { count: notifications.length })} />}>
      {notifications.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13.5, margin: 0 }}>
          {t("dashboard.verifications.empty")}
        </p>
      ) : (
        <div className="pubs">
          {notifications.map((n) => (
            <div key={n.id} className="pub">
              <div>
                <p className="pub__id" style={{ color: "var(--ink)" }}>
                  {n.company ?? t("dashboard.verifications.anonymous")}
                </p>
                {(n.job_title || n.area) && (
                  <p className="pub__meta">{[n.job_title, n.area].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <span className="mono" style={{ color: "var(--ink-4)", fontSize: 11.5 }}>
                {formatDate(fmt, n.verified_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── Mensagens — um card por empresa; clique abre a conversa dedicada ────────

const MSG_STATUS_ICON: Record<DashboardMessage["state"], string> = {
  pending: "◷", responded: "✓", ignored: "✕",
};
const MSG_STATUS_FG: Record<DashboardMessage["state"], string> = {
  pending: "var(--ink-3)", responded: "var(--signal-ink)", ignored: "var(--amber)",
};

interface CompanyThread {
  company: string;
  latest:  DashboardMessage;
  count:   number;
}

// Um card por empresa (sem duplicados), preservando a ordem de aparição.
function groupMessagesByCompany(messages: DashboardMessage[]): CompanyThread[] {
  const order: string[] = [];
  const map = new Map<string, CompanyThread>();
  for (const m of messages) {
    let th = map.get(m.company);
    if (!th) { th = { company: m.company, latest: m, count: 0 }; map.set(m.company, th); order.push(m.company); }
    th.count += 1;
    if (m.sent_at > th.latest.sent_at) th.latest = m;
  }
  return order.map((c) => map.get(c)!);
}

function MessagesView({ messages }: { messages: DashboardMessage[] }) {
  const t = useT();
  if (messages.length === 0) {
    return (
      <Panel style={{ paddingTop: 0, paddingBottom: 0 }}
             header={<PanelHeader title={t("dashboard.tab.messages.label")}
                                  meta={t("dashboard.tab.messages.subtitle")} />}>
        <EmptyState icon="✉" title={t("dashboard.messages.empty_title")}
                    description={t("dashboard.messages.empty")} />
      </Panel>
    );
  }
  const threads = groupMessagesByCompany(messages);
  return (
    <div className="msgs">
      {threads.map((th) => <CompanyCard key={th.company} thread={th} />)}
    </div>
  );
}

function CompanyCard({ thread }: { thread: CompanyThread }) {
  const t = useT();
  const tp = useTp();
  const fmt = useFmt();
  const navigate = useNavigate();
  const m = thread.latest;
  const statusLabel = t(`dashboard.messages.status.${m.state}`);
  const excerpt = m.body.length > 240 ? m.body.slice(0, 240) + "…" : m.body;
  const open = () => navigate(`/dashboard/companies/${encodeURIComponent(thread.company)}`);

  return (
    <div role="button" tabIndex={0} className="msg"
         onClick={open}
         onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div>
          <div className="msg__co">{thread.company}</div>
          {m.job_title && <div className="msg__job">{m.job_title}</div>}
        </div>
        <span className="msg__st" title={statusLabel} aria-label={statusLabel}
              style={{ color: MSG_STATUS_FG[m.state] }}>
          {MSG_STATUS_ICON[m.state]}
        </span>
      </div>
      <div className="msg__body">{excerpt}</div>
      <div className="msg__date">{formatDate(fmt, m.sent_at)}</div>
      {thread.count > 1 && <div className="msg__count">{tp("dashboard.messages.count", thread.count)}</div>}
    </div>
  );
}

// ── Configurações ────────────────────────────────────────────────────────────

function SettingsForm({ account, busy, onSubmit }: {
  account: DashboardPayload["account"]; busy: boolean;
  onSubmit: (patch: Partial<DashboardPayload["account"]>) => void;
}) {
  const t = useT();
  const [emailRecovery, setEmailRecovery] = useState(account.email_recovery ?? "");
  const [emailContact,  setEmailContact]  = useState(account.email_contact  ?? "");
  const [phoneContact,  setPhoneContact]  = useState(account.phone_contact  ?? "");
  const [directory,     setDirectory]     = useState(account.directory);
  const [watch,         setWatch]         = useState(account.watch);
  const [notifEmail,    setNotifEmail]    = useState(account.notification_email   ?? "");
  const [notifHook,     setNotifHook]     = useState(account.notification_webhook ?? "");

  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      email_recovery:       emailRecovery,
      email_contact:        emailContact,
      phone_contact:        phoneContact,
      directory, watch,
      notification_email:   notifEmail,
      notification_webhook: notifHook,
    });
  }

  return (
    <form onSubmit={handle} className="form">
      <Field label={t("dashboard.settings.email_recovery")}>
        <input type="email" value={emailRecovery} onChange={(e) => setEmailRecovery(e.target.value)} autoComplete="email" />
      </Field>
      <Field label={t("dashboard.settings.email_contact")} hint={t("dashboard.settings.contact_hint")}>
        <input type="email" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} autoComplete="email" />
      </Field>
      <Field label={t("dashboard.settings.phone_contact")} hint={t("dashboard.settings.contact_hint")}>
        <input type="tel" value={phoneContact} onChange={(e) => setPhoneContact(e.target.value)} autoComplete="tel" />
      </Field>
      <Toggle label={t("dashboard.settings.directory")} checked={directory} onChange={setDirectory} />
      <Toggle label={t("dashboard.settings.watch")} checked={watch} onChange={setWatch} />
      <Field label={t("dashboard.settings.notif_email")} hint={t("dashboard.settings.optional")}>
        <input type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} />
      </Field>
      <Field label={t("dashboard.settings.webhook")} hint={t("dashboard.settings.optional")}>
        <input type="url" value={notifHook} onChange={(e) => setNotifHook(e.target.value)} />
      </Field>
      <div>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {t("dashboard.settings.save")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="f">
      <span className="f__k">
        {label}
        {hint && <span className="hint"> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span className={`track${checked ? " on" : ""}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="knob" />
      </span>
      <span>{label}</span>
    </label>
  );
}
