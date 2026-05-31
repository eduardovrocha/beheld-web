/**
 * Dashboard SPA route (`/dashboard`).
 *
 * Visual: same vocabulary as Home — Switzer body, monospace uppercase
 * labels with letter-spacing, white cards on cream bg with 1px hairlines,
 * accent gold for numerics. Tokens come from index.css (--bg, --text,
 * --muted, --rule, --card-bg, --accent, --ok, --warn) so light/dark mode
 * flips work automatically.
 *
 * Auth: Bearer token from `?session=<...>` (issued by `beheld auth`)
 * persisted in sessionStorage; subsequent requests stay authenticated.
 *
 * Tabs (URL-hash synced so deep links to a specific section work):
 *   #visao-geral, #publicacoes, #verificacoes, #mensagens, #configuracoes
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { DevNav } from "@/components/dev/DevNav";
import { TabStrip, type TabDef } from "@/components/TabStrip";
import { VerifiedIcon } from "@/components/icons";
import { useT, useTp, useFmt } from "@/i18n/I18nProvider";
import type { Formatters } from "@/i18n/format";
import type { TKey } from "@/i18n/dict";
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
  type DashboardNotification,
  type DashboardMessage,
} from "@/lib/dashboardApi";

// ── format helpers ──────────────────────────────────────────────────────────

function formatDate(fmt: Formatters, iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : fmt.date(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateTime(fmt: Formatters, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${fmt.date(d, { day: "2-digit", month: "2-digit", year: "numeric" })} · ${fmt.time(d, { hour: "2-digit", minute: "2-digit" })}`;
}

// ── tabs ────────────────────────────────────────────────────────────────────

type TabId = "overview" | "messages" | "settings";
type OverviewSubTabId = "summary" | "bundles" | "verifications";

const TABS: Array<{ id: TabId; labelKey: TKey; hash: string; subtitleKey: TKey }> = [
  { id: "overview",      labelKey: "dashboard.tab.overview.label",      hash: "#visao-geral",   subtitleKey: "dashboard.tab.overview.subtitle" },
  { id: "messages",      labelKey: "dashboard.tab.messages.label",      hash: "#mensagens",     subtitleKey: "dashboard.tab.messages.subtitle" },
  { id: "settings",      labelKey: "dashboard.tab.settings.label",      hash: "#configuracoes", subtitleKey: "dashboard.tab.settings.subtitle" },
];

function tabFromHash(hash: string): TabId {
  const found = TABS.find((t) => t.hash === hash);
  return found?.id ?? "overview";
}

// ── route ───────────────────────────────────────────────────────────────────

export function Dashboard() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData]   = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  const [active, setActive] = useState<TabId>(() => tabFromHash(window.location.hash));
  const [overviewSub, setOverviewSub] = useState<OverviewSubTabId>("summary");

  useEffect(() => {
    function onHash() { setActive(tabFromHash(window.location.hash)); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function selectTab(id: TabId) {
    setActive(id);
    const tab = TABS.find((t) => t.id === id);
    if (tab) history.replaceState(null, "", tab.hash);
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

  if (error) {
    return (
      <Shell>
        <Hero handle="—" fingerprint="" subtitle={t("dashboard.error.subtitle")} />
        <Card>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>{error}</p>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
            {t("dashboard.error.auth_hint_prefix")}<code style={{ color: "var(--accent)" }}>beheld auth</code>{t("dashboard.error.auth_hint_suffix")}
          </p>
        </Card>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>{t("dashboard.loading")}</p>
      </Shell>
    );
  }

  const { account, bundles, notifications, messages } = data;
  const activeTab = TABS.find((tab) => tab.id === active) ?? TABS[0];
  // Slug do bundle publicado mais relevante (visível, mais recente) — usado
  // pelo DevNav pra linkar pro perfil público em /v/<slug>. Sem nenhum
  // visível, o link some.
  const primarySlug = bundles.find((b) => b.visible)?.url_slug ?? null;

  return (
    <Shell>
      <Hero handle={account.handle} fingerprint={account.fingerprint}
            subtitle={t(activeTab.subtitleKey)} slug={primarySlug} />

      <TabStrip<TabId>
        tabs={TABS.map((tab) => ({
          id:    tab.id,
          label: t(tab.labelKey),
          badge: tab.id === "messages" ? messages.length : null,
        })) as readonly TabDef<TabId>[]}
        active={active}
        onSelect={selectTab} />

      <div className="pt-8">
        {active === "overview" && (
          <div className="grid" style={{ gap: 24 }}>
            <TabStrip<OverviewSubTabId>
              tabs={[
                { id: "summary",       label: t("dashboard.overview.subtab.summary.label"), badge: null },
                { id: "bundles",       label: t("dashboard.tab.bundles.label"),       badge: bundles.length },
                { id: "verifications", label: t("dashboard.tab.verifications.label"), badge: notifications.length },
              ]}
              active={overviewSub}
              onSelect={setOverviewSub} />

            {overviewSub === "summary" && (
              <OverviewTab bundlesCount={bundles.length}
                           contactConfigured={account.contact_configured}
                           interest={data.interest}
                           evolution={data.evolution} />
            )}

            {overviewSub === "bundles" && (
              bundles.length === 0 ? (
                <EmptyCard>
                  {t("dashboard.bundles.empty_prefix")}
                  <code style={{ color: "var(--accent)" }}>beheld share</code>{t("dashboard.bundles.empty_suffix")}
                </EmptyCard>
              ) : (
                <Card padded={false}>
                  {bundles.map((b, i) => (
                    <BundleRow key={b.id} bundle={b} busy={busy} first={i === 0}
                               onToggle={() => refresh(() => toggleBundle(b.id))}
                               onRevoke={() => {
                                 if (!confirm(t("dashboard.bundles.revoke_confirm"))) return;
                                 refresh(() => revokeBundle(b.id));
                               }} />
                  ))}
                </Card>
              )
            )}

            {overviewSub === "verifications" && (
              notifications.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  {t("dashboard.verifications.empty")}
                </p>
              ) : (
                <Card padded={false}>
                  {notifications.map((n, i) => <NotificationRow key={n.id} v={n} first={i === 0} />)}
                </Card>
              )
            )}
          </div>
        )}

        {active === "messages" && (
          messages.length === 0 ? (
            <EmptyCard>{t("dashboard.messages.empty")}</EmptyCard>
          ) : (
            <MessagesPanel messages={messages} />
          )
        )}

        {active === "settings" && (
          <SettingsForm account={account} busy={busy}
                        onSubmit={(patch) => refresh(() => updateSettings(patch))} />
        )}
      </div>

      <SignOutFooter handle={account.handle}
                     onSignOut={() => { clearSessionToken(); navigate("/", { replace: true }); }} />
    </Shell>
  );
}

// ── shell / hero ────────────────────────────────────────────────────────────

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "64px 32px 96px", color: "var(--text)" }}>
      {children}
    </div>
  );
}

function Hero({ handle, fingerprint, subtitle, slug }: {
  handle: string; fingerprint: string; subtitle: string; slug?: string | null;
}) {
  const t = useT();
  return (
    <header className="mb-10">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("dashboard.eyebrow")}
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        {handle}
      </h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-3 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        <DevNav current="dashboard" slug={slug ?? undefined} bare />
      </div>
      {fingerprint && (
        <div className="mt-2 font-mono"
             style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
          {t("dashboard.hero.fingerprint_label")} <span style={{ color: "var(--accent)" }}>{fingerprint.slice(0, 24)}…</span>
        </div>
      )}
      <div className="mt-2 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        {subtitle}
      </div>
    </header>
  );
}

// ── overview tab — Glance cards + P21 interest banner + P22 evolution card ──

function OverviewTab({ bundlesCount, contactConfigured, interest, evolution }: {
  bundlesCount:       number;
  contactConfigured:  boolean;
  interest:           import("@/lib/dashboardApi").DashboardInterest;
  evolution:          import("@/lib/dashboardApi").DashboardEvolution;
}) {
  const t = useT();
  return (
    <div className="grid gap-4">
      <InterestBanner companies={interest.companies} />
      <div className="grid gap-4"
           style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Glance label={t("dashboard.overview.glance.bundles_label")} num={String(bundlesCount)}
                note={bundlesCount === 0 ? t("dashboard.overview.glance.bundles_note_zero") : t("dashboard.overview.glance.bundles_note")} />
        <Glance label={t("dashboard.overview.glance.contact_label")}
                num={contactConfigured ? t("dashboard.overview.glance.contact_configured") : t("dashboard.overview.glance.contact_pending")}
                numColor={contactConfigured ? "var(--ok)" : "var(--warn)"}
                note={contactConfigured ? t("dashboard.overview.glance.contact_note_ok") : t("dashboard.overview.glance.contact_note_pending")} />
        <Glance label={t("dashboard.overview.glance.tier_label")} num="signature_only" note={t("dashboard.overview.glance.tier_note")} />
      </div>
      <EvolutionCard evolution={evolution} />
    </div>
  );
}

// P21: anonymous interest banner. Single sentence, no metadata. Hidden
// when the count is 0 — keeps the dashboard quiet when there's nothing
// to communicate.
function InterestBanner({ companies }: { companies: number }) {
  const t = useT();
  const tp = useTp();
  if (companies <= 0) return null;
  return (
    <div style={{
      padding: "14px 18px",
      background: "rgba(138,111,62,0.10)",
      border: "1px solid rgba(138,111,62,0.35)",
      display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center",
    }}>
      <span className="font-mono"
            style={{ color: "var(--accent)", fontSize: 26, fontWeight: 700,
                      fontFeatureSettings: '"tnum"', lineHeight: 1 }}>
        {companies}
      </span>
      <div>
        <div style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.5 }}>
          {tp("dashboard.overview.interest", companies)}
        </div>
        <div className="font-mono uppercase"
             style={{ color: "var(--muted)", fontSize: 9.5, letterSpacing: "0.14em", marginTop: 4 }}>
          {t("dashboard.overview.interest.note")}
        </div>
      </div>
    </div>
  );
}

// P22.2: evolution indicator. Visual bar of filled vs unfilled dots
// (scaled to a target of 8 — arbitrary but gives proportional feedback;
// after 8 bundles it just stays fully filled). Below the bar: points +
// days since last bundle + CLI hint when stale (≥ 5 days).
function EvolutionCard({ evolution }: { evolution: import("@/lib/dashboardApi").DashboardEvolution }) {
  const t = useT();
  const { points, days_since_last, stale_for_curve } = evolution;
  const target = 8;
  const filled = Math.min(points, target);
  const dots = "█".repeat(filled) + "░".repeat(Math.max(0, target - filled));
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)", padding: "16px 20px" }}>
      <div className="font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 9.5, letterSpacing: "0.18em", marginBottom: 6 }}>
        {t("dashboard.overview.evolution.title")}
      </div>
      <div className="font-mono" style={{
        color: filled === 0 ? "var(--muted-soft)" : "var(--accent)",
        fontSize: 18, letterSpacing: "0.04em", lineHeight: 1,
      }}>
        {dots}
      </div>
      <div className="mt-2" style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
        {points === 0 && <>{t("dashboard.overview.evolution.points_zero")}</>}
        {points === 1 && <>{t("dashboard.overview.evolution.points_one")}</>}
        {points > 1 && <>{t("dashboard.overview.evolution.points_many", { count: points })}</>}
        {days_since_last != null && (
          <>
            {" · "}
            <span style={{ color: stale_for_curve ? "var(--warn)" : "var(--muted)" }}>
              {t("dashboard.overview.evolution.updated_prefix")}{days_since_last === 0 ? t("dashboard.overview.evolution.updated_lt1") : t("dashboard.overview.evolution.updated_days", { days: days_since_last })}
            </span>
          </>
        )}
      </div>
      {stale_for_curve && (
        <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 12.5, lineHeight: 1.55 }}>
          {t("dashboard.overview.evolution.stale_hint")}
          {" "}
          <code style={{ color: "var(--accent)", background: "var(--rule-soft)", padding: "1px 6px" }}>
            beheld profile generate
          </code>
        </div>
      )}
    </div>
  );
}

function Glance({ label, num, note, numColor }: {
  label: string; num: string; note: ReactNode; numColor?: string;
}) {
  return (
    <div className="p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}>
        {label}
      </div>
      <div className="mb-1 font-semibold"
           style={{ color: numColor ?? "var(--text)", fontSize: 18, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {num}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>{note}</div>
    </div>
  );
}

// ── cards / rows ────────────────────────────────────────────────────────────

function Card({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--rule)",
      padding: padded ? "24px" : 0,
    }}>
      {children}
    </div>
  );
}

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{children}</p>
    </Card>
  );
}

const ROW_STYLE = (first: boolean) => ({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 16,
  padding: "16px 20px",
  borderTop: first ? "none" : "1px solid var(--rule-soft)",
  alignItems: "start",
}) as React.CSSProperties;

function Badge({ kind, children }: { kind: "ok" | "warn" | "muted"; children: ReactNode }) {
  const palette = kind === "ok"
    ? { bg: "rgba(74,124,78,0.12)",  fg: "var(--ok)",   bd: "rgba(74,124,78,0.4)" }
    : kind === "warn"
    ? { bg: "rgba(181,97,53,0.12)",  fg: "var(--warn)", bd: "rgba(181,97,53,0.4)" }
    : { bg: "var(--rule-soft)",      fg: "var(--muted)", bd: "var(--rule)" };
  return (
    <span className="inline-block font-mono uppercase"
          style={{
            background: palette.bg, color: palette.fg,
            border: `1px solid ${palette.bd}`,
            padding: "2px 8px", fontSize: 9, letterSpacing: "0.12em",
            marginLeft: 8, verticalAlign: "middle",
          }}>
      {children}
    </span>
  );
}

function BundleRow({ bundle, busy, first, onToggle, onRevoke }: {
  bundle: DashboardBundle; busy: boolean; first: boolean;
  onToggle: () => void; onRevoke: () => void;
}) {
  const t = useT();
  const tp = useTp();
  const fmt = useFmt();
  const portal = window.location.origin;
  return (
    <div style={ROW_STYLE(first)}>
      <div>
        <div style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.6 }}>
          {formatDate(fmt, bundle.published_at)}
          {bundle.status === "verified" && (
            <span title={t("common.verified.title")} aria-label={t("common.verified.aria")}
                  style={{ display: "inline-flex", alignItems: "center",
                           color: "var(--ok)", marginLeft: 8, verticalAlign: "middle" }}>
              <VerifiedIcon size={14} />
            </span>
          )}
          {bundle.status === "outdated" && <Badge kind="warn">{t("common.bundle_status.outdated")}</Badge>}
          {bundle.status === "revoked"  && <Badge kind="muted">{t("common.bundle_status.revoked")}</Badge>}
          {!bundle.visible && <Badge kind="muted">{t("dashboard.bundles.hidden")}</Badge>}
        </div>
        <div className="mt-1" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.75, fontFeatureSettings: '"tnum"' }}>
          <a href={`${portal}/v/${bundle.url_slug}`} style={{ color: "var(--accent)" }}>
            beheld.dev/v/{bundle.url_slug}
          </a>
          {" · "}{bundle.verifications_count} {tp("dashboard.bundles.verifications", bundle.verifications_count)}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center font-mono"
           style={{ gap: 10, fontSize: 12, letterSpacing: "0.04em" }}>
        <NavLinkButton disabled={busy} onClick={onToggle}>
          {bundle.visible ? t("dashboard.bundles.hide") : t("dashboard.bundles.show")}
        </NavLinkButton>
        <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
        <NavLinkButton disabled={busy} onClick={onRevoke} tone="warn">
          {t("dashboard.bundles.revoke")}
        </NavLinkButton>
      </div>
    </div>
  );
}

function NotificationRow({ v, first }: { v: DashboardNotification; first: boolean }) {
  const t = useT();
  const fmt = useFmt();
  return (
    <div style={ROW_STYLE(first)}>
      <div>
        <div style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.6 }}>
          {v.company ?? t("dashboard.verifications.anonymous")}
          <span style={{ color: "var(--muted)" }}> · {formatDateTime(fmt, v.verified_at)}</span>
        </div>
        {(v.job_title || v.area) && (
          <div className="mt-1" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.75 }}>
            {[v.job_title, v.area].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <span />
    </div>
  );
}

// ── Messages tab — grid of cards, one per company (mirrors the recruiter
// Messages view): each card previews the latest message; clicking opens the
// conversation on a dedicated page (/dashboard/companies/:company), split
// per vaga, with reply/ignore inline there. ────────────────────────────────

const MSG_STATUS_ICON: Record<DashboardMessage["state"], string> = {
  pending: "◷", responded: "✓", ignored: "✕",
};
const MSG_STATUS_FG: Record<DashboardMessage["state"], string> = {
  pending: "var(--muted)", responded: "var(--ok)", ignored: "var(--warn)",
};

interface CompanyThread {
  company: string;
  msgs:    DashboardMessage[];
  latest:  DashboardMessage;
  count:   number;
}

// Um card por empresa (sem duplicados), preservando a ordem de aparição.
function groupMessagesByCompany(messages: DashboardMessage[]): CompanyThread[] {
  const order: string[] = [];
  const map = new Map<string, CompanyThread>();
  for (const m of messages) {
    let th = map.get(m.company);
    if (!th) { th = { company: m.company, msgs: [], latest: m, count: 0 }; map.set(m.company, th); order.push(m.company); }
    th.msgs.push(m); th.count += 1;
    if (m.sent_at > th.latest.sent_at) th.latest = m;
  }
  return order.map((c) => map.get(c)!);
}

function MessagesPanel({ messages }: { messages: DashboardMessage[] }) {
  const threads = groupMessagesByCompany(messages);
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
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
  const fg = MSG_STATUS_FG[m.state];
  const statusLabel = t(`dashboard.messages.status.${m.state}`);
  const excerpt = m.body.length > 240 ? m.body.slice(0, 240) + "…" : m.body;
  const href = `/dashboard/companies/${encodeURIComponent(thread.company)}`;
  const open = () => navigate(href);

  return (
    <div role="button" tabIndex={0}
         onClick={open}
         onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
         style={{
           display: "flex", flexDirection: "column",
           background: "var(--card-bg)", border: "1px solid var(--rule)",
           padding: 18, minHeight: 196, cursor: "pointer",
           transition: "border-color 120ms ease",
         }}
         onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
         onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}>
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {thread.company}
        </span>
        <span title={statusLabel} aria-label={statusLabel}
              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center",
                       justifyContent: "center", width: 30, height: 30, fontSize: 17, lineHeight: 1, color: fg }}>
          {MSG_STATUS_ICON[m.state]}
        </span>
      </div>

      {m.job_title && (
        <div className="mt-1" style={{ color: "var(--muted)", fontSize: 13 }}>{m.job_title}</div>
      )}

      <div className="mt-3" style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55 }}>{excerpt}</div>

      <div className="font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 11, marginTop: 8,
                     letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        {formatDate(fmt, m.sent_at)}
      </div>

      {thread.count > 1 && (
        <div className="mt-auto flex flex-wrap items-center pt-4" style={{ gap: 8 }}>
          <span className="font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
            {tp("dashboard.messages.count", thread.count)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── buttons ─────────────────────────────────────────────────────────────────

const BUTTON_BASE: React.CSSProperties = {
  font: "inherit", fontSize: 12.5,
  padding: "6px 14px",
  borderRadius: 0,
  cursor: "pointer",
  letterSpacing: "0.02em",
  transition: "background 120ms ease, color 120ms ease",
};

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
            style={{
              ...BUTTON_BASE,
              background: "var(--text)", color: "var(--bg)",
              border: "1px solid var(--text)",
              opacity: props.disabled ? 0.4 : 1,
              cursor: props.disabled ? "not-allowed" : "pointer",
              ...(props.style ?? {}),
            }} />
  );
}
// Inline text-link styled button — same visual language as CompanyNav's
// "Dashboard | Directory" links. Muted by default; hovers to accent (or
// warn for destructive actions). No border, no fill — reads as navigation
// rather than a heavy CTA.
function NavLinkButton({
  tone = "accent",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "accent" | "warn" }) {
  const hover = tone === "warn" ? "var(--warn)" : "var(--accent)";
  return (
    <button
      {...props}
      style={{
        background: "none", border: "none", padding: 0,
        font: "inherit", letterSpacing: "0.04em",
        color: "var(--muted)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.45 : 1,
        transition: "color 120ms ease",
        ...(props.style ?? {}),
      }}
      onMouseEnter={(e) => { if (!props.disabled) e.currentTarget.style.color = hover; }}
      onMouseLeave={(e) => { if (!props.disabled) e.currentTarget.style.color = "var(--muted)"; }}>
      {children}
    </button>
  );
}

// ── settings form ───────────────────────────────────────────────────────────

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
    <Card>
      <form onSubmit={handle} className="grid gap-5">
        <Field label={t("dashboard.settings.email_recovery")}>
          <Input type="email" value={emailRecovery} onChange={(e) => setEmailRecovery(e.target.value)} autoComplete="email" />
        </Field>
        <Field label={t("dashboard.settings.email_contact")} hint={t("dashboard.settings.contact_hint")}>
          <Input type="email" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} autoComplete="email" />
        </Field>
        <Field label={t("dashboard.settings.phone_contact")} hint={t("dashboard.settings.contact_hint")}>
          <Input type="tel" value={phoneContact} onChange={(e) => setPhoneContact(e.target.value)} autoComplete="tel" />
        </Field>
        <Toggle label={t("dashboard.settings.directory")} checked={directory} onChange={setDirectory} />
        <Toggle label={t("dashboard.settings.watch")} checked={watch} onChange={setWatch} />
        <Field label={t("dashboard.settings.notif_email")} hint={t("dashboard.settings.optional")}>
          <Input type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} />
        </Field>
        <Field label={t("dashboard.settings.webhook")} hint={t("dashboard.settings.optional")}>
          <Input type="url" value={notifHook} onChange={(e) => setNotifHook(e.target.value)} />
        </Field>
        <div>
          <PrimaryButton type="submit" disabled={busy}>{t("dashboard.settings.save")}</PrimaryButton>
        </div>
      </form>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
        {label}
        {hint && (
          <span style={{ color: "var(--muted-soft)", letterSpacing: 0, textTransform: "none" }}> · {hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
           style={{
             font: "inherit", fontSize: 14,
             padding: "8px 10px",
             color: "var(--text)", background: "var(--bg)",
             border: "1px solid var(--rule)",
             borderRadius: 0,
             outline: "none",
             ...(props.style ?? {}),
           }} />
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span style={{
        position: "relative",
        width: 38, height: 20,
        background: checked ? "var(--text)" : "var(--rule)",
        transition: "background 150ms ease",
        flexShrink: 0,
      }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
               className="absolute inset-0 cursor-pointer opacity-0" />
        <span style={{
          position: "absolute",
          top: 2, left: checked ? 20 : 2,
          width: 16, height: 16,
          background: "var(--bg)",
          transition: "left 150ms ease",
        }} />
      </span>
      <span style={{ color: "var(--text)", fontSize: 13.5 }}>{label}</span>
    </label>
  );
}

// ── footer ──────────────────────────────────────────────────────────────────

function SignOutFooter({ handle, onSignOut }: { handle: string; onSignOut: () => void }) {
  const t = useT();
  return (
    <footer className="mt-16 flex items-center justify-between py-8"
            style={{ borderTop: "1px solid var(--rule)" }}>
      <span className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
        {t("dashboard.footer.authed", { handle })}
      </span>
      <button onClick={onSignOut}
              className="font-mono uppercase"
              style={{
                background: "none", border: 0, padding: 0,
                color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em",
                textDecoration: "underline",
                textDecorationColor: "var(--rule)",
                textUnderlineOffset: 3,
                cursor: "pointer",
              }}>
        {t("dashboard.footer.sign_out")}
      </button>
    </footer>
  );
}
