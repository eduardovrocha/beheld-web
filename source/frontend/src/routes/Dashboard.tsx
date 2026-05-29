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

import { TabStrip, type TabDef } from "@/components/TabStrip";
import { useT, useTp, useFmt } from "@/i18n/I18nProvider";
import type { Formatters } from "@/i18n/format";
import type { TKey } from "@/i18n/dict";
import {
  clearSessionToken,
  getDashboard,
  ignoreMessage,
  respondMessage,
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

type TabId = "overview" | "bundles" | "verifications" | "messages" | "settings";

const TABS: Array<{ id: TabId; labelKey: TKey; hash: string; subtitleKey: TKey }> = [
  { id: "overview",      labelKey: "dashboard.tab.overview.label",      hash: "#visao-geral",   subtitleKey: "dashboard.tab.overview.subtitle" },
  { id: "bundles",       labelKey: "dashboard.tab.bundles.label",       hash: "#publicacoes",   subtitleKey: "dashboard.tab.bundles.subtitle" },
  { id: "verifications", labelKey: "dashboard.tab.verifications.label", hash: "#verificacoes",  subtitleKey: "dashboard.tab.verifications.subtitle" },
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

  return (
    <Shell>
      <Hero handle={account.handle} fingerprint={account.fingerprint} subtitle={t(activeTab.subtitleKey)} />

      <TabStrip<TabId>
        tabs={TABS.map((tab) => ({
          id:    tab.id,
          label: t(tab.labelKey),
          badge: tab.id === "bundles"       ? bundles.length
               : tab.id === "verifications" ? notifications.length
               : tab.id === "messages"      ? messages.length
               : null,
        })) as readonly TabDef<TabId>[]}
        active={active}
        onSelect={selectTab} />

      <div className="pt-8">
        {active === "overview" && (
          <OverviewTab bundlesCount={bundles.length}
                       contactConfigured={account.contact_configured}
                       interest={data.interest}
                       evolution={data.evolution} />
        )}

        {active === "bundles" && (
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

        {active === "verifications" && (
          notifications.length === 0 ? (
            <EmptyCard>{t("dashboard.verifications.empty")}</EmptyCard>
          ) : (
            <Card padded={false}>
              {notifications.map((n, i) => <NotificationRow key={n.id} v={n} first={i === 0} />)}
            </Card>
          )
        )}

        {active === "messages" && (
          messages.length === 0 ? (
            <EmptyCard>{t("dashboard.messages.empty")}</EmptyCard>
          ) : (
            <Card padded={false}>
              {messages.map((m, i) => (
                <MessageRow key={m.id} m={m} busy={busy} first={i === 0}
                            canRespond={account.contact_configured}
                            onRespond={(reply) => refresh(() => respondMessage(m.id, reply))}
                            onIgnore={() => refresh(() => ignoreMessage(m.id))} />
              ))}
            </Card>
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

function Hero({ handle, fingerprint, subtitle }: {
  handle: string; fingerprint: string; subtitle: string;
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
        <span style={{ color: "var(--muted)", fontWeight: 400 }}> {t("dashboard.hero.subtitle")}</span>
      </h1>
      {fingerprint && (
        <div className="mt-3 font-mono"
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
          {bundle.status === "verified" && <Badge kind="ok">{t("common.bundle_status.verified")}</Badge>}
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
      <div className="flex flex-shrink-0 gap-2">
        <SecondaryButton disabled={busy} onClick={onToggle}>
          {bundle.visible ? t("dashboard.bundles.hide") : t("dashboard.bundles.show")}
        </SecondaryButton>
        <DangerButton disabled={busy} onClick={onRevoke}>{t("dashboard.bundles.revoke")}</DangerButton>
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

function MessageRow({ m, busy, first, canRespond, onRespond, onIgnore }: {
  m: DashboardMessage; busy: boolean; first: boolean; canRespond: boolean;
  onRespond: (reply: string) => void; onIgnore: () => void;
}) {
  const t = useT();
  const fmt = useFmt();
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState("");

  function send() {
    onRespond(reply.trim());
    setComposing(false);
    setReply("");
  }

  return (
    <div style={ROW_STYLE(first)}>
      <div>
        <div style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.6 }}>
          {m.company}
          <span style={{ color: "var(--muted)" }}> · {formatDateTime(fmt, m.sent_at)}</span>
        </div>
        {m.job_title && (
          <div className="mt-1" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.75 }}>
            {m.job_title}
          </div>
        )}
        <div className="mt-2" style={{
          color: "var(--text)", fontSize: 13.5, lineHeight: 1.7,
          padding: "10px 12px",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {m.body.length > 240 ? m.body.slice(0, 240) + "…" : m.body}
        </div>

        {/* compositor da resposta (F_REPLY) — texto curto e opcional */}
        {composing && m.state === "pending" && (
          <div className="mt-2">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                      disabled={busy} rows={3} autoFocus maxLength={2000}
                      placeholder={t("dashboard.messages.reply_placeholder")}
                      style={{
                        width: "100%", font: "inherit", fontSize: 13.5, lineHeight: 1.6,
                        padding: "8px 10px", color: "var(--text)", background: "var(--bg)",
                        border: "1px solid var(--rule)", borderRadius: 0, outline: "none",
                        resize: "vertical",
                      }} />
            <div className="mt-2 flex gap-2">
              <PrimaryButton disabled={busy} onClick={send}>{t("dashboard.messages.send_reply")}</PrimaryButton>
              <SecondaryButton disabled={busy} onClick={() => { setComposing(false); setReply(""); }}>{t("common.cancel")}</SecondaryButton>
            </div>
          </div>
        )}

        {/* resposta enviada — o dev vê o próprio texto */}
        {m.state === "responded" && m.reply_body && (
          <div className="mt-2" style={{ borderLeft: "2px solid var(--ok)", paddingLeft: 10 }}>
            <div className="font-mono uppercase" style={{ color: "var(--ok)", fontSize: 9, letterSpacing: "0.14em", marginBottom: 3 }}>
              {t("dashboard.messages.your_reply")}
            </div>
            <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {m.reply_body}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 items-start gap-2">
        {m.state === "pending" && !composing && (
          <>
            <PrimaryButton disabled={busy || !canRespond} onClick={() => setComposing(true)}>{t("dashboard.messages.respond")}</PrimaryButton>
            <SecondaryButton disabled={busy} onClick={onIgnore}>{t("dashboard.messages.ignore")}</SecondaryButton>
          </>
        )}
        {m.state === "responded" && (
          <span className="font-mono uppercase" style={{ color: "var(--ok)", fontSize: 10, letterSpacing: "0.12em" }}>
            {t("dashboard.messages.responded", { date: formatDate(fmt, m.responded_at ?? m.sent_at) })}
          </span>
        )}
        {m.state === "ignored" && (
          <span className="font-mono uppercase" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.12em" }}>
            {t("dashboard.messages.ignored")}
          </span>
        )}
      </div>
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
function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
            style={{
              ...BUTTON_BASE,
              background: "transparent", color: "var(--text)",
              border: "1px solid var(--rule)",
              opacity: props.disabled ? 0.45 : 1,
              cursor: props.disabled ? "not-allowed" : "pointer",
              ...(props.style ?? {}),
            }} />
  );
}
function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
            style={{
              ...BUTTON_BASE,
              background: "transparent", color: "var(--warn)",
              border: "1px solid color-mix(in srgb, var(--warn) 60%, var(--rule))",
              opacity: props.disabled ? 0.45 : 1,
              cursor: props.disabled ? "not-allowed" : "pointer",
              ...(props.style ?? {}),
            }} />
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
