/**
 * Recruiter directory (`/directory`).
 *
 * Same visual vocabulary as Dashboard — Switzer body, mono uppercase
 * section labels, white cards with rule hairlines, accent gold for
 * numerics. Auth via signed company cookie set by
 * `POST /api/v1/sessions/company/verify`.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { TabStrip, type TabDef } from "@/components/TabStrip";
import { Tooltip } from "@/components/Tooltip";
import { DragScroll } from "@/components/DragScroll";
import { Dropdown } from "@/components/Dropdown";
import { VerifiedIcon } from "@/components/icons";
import { useT, useTp, useFmt } from "@/i18n/I18nProvider";
import { CompanyNav } from "@/components/company/CompanyNav";
import { SaveDevButton } from "@/components/company/SaveDevButton";
import {
  getDirectory,
  DirectoryAuthError,
  type DevSummary,
  type DirectoryFilters,
  type DirectoryPayload,
  type DirectoryQuery,
} from "@/lib/directoryApi";

// ── tabs ──────────────────────────────────────────────────────────────────
type DirTab = "filters" | "results";

const DIR_TABS: Array<{ id: DirTab; labelKey: string; hash: string }> = [
  { id: "filters", labelKey: "directory.tab.filters", hash: "#filtros" },
  { id: "results", labelKey: "directory.tab.results", hash: "#resultados" },
];

function dirTabFromHash(hash: string): DirTab {
  return DIR_TABS.find((t) => t.hash === hash)?.id ?? "results";
}

export function Directory() {
  const navigate = useNavigate();
  const t = useT();
  const tp = useTp();
  const [data, setData]       = useState<DirectoryPayload | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  // Local filter state — mirrors the server's filter shape. The default
  // 0.25–0.50 test ratio range is a sensible starting filter: weeds out
  // bundles with no test discipline at all and the few outliers above 50%
  // (which usually mean tests are auto-generated). Recruiters can widen
  // immediately by dragging the slider.
  const [draft, setDraft] = useState<DirectoryFilters>({
    ecosystems: [], test_ratio_min: "0.25", test_ratio_max: "0.50", status: "all",
  });

  const [applied, setApplied] = useState(false);
  const [tab, setTab] = useState<DirTab>(() => dirTabFromHash(window.location.hash));
  useEffect(() => {
    function onHash() { setTab(dirTabFromHash(window.location.hash)); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  function selectTab(id: DirTab) {
    setTab(id);
    const t = DIR_TABS.find((x) => x.id === id);
    if (t) history.replaceState(null, "", t.hash);
  }

  async function load(query: DirectoryQuery) {
    setBusy(true);
    try {
      const payload = await getDirectory(query);
      setData(payload);
      setDraft(payload.filters);
      setError(null);
    } catch (e) {
      if (e instanceof DirectoryAuthError) {
        navigate("/companies/new", { replace: true });
        return;
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Initial load applies the default test ratio range (see `draft` above)
    // so the URL the server sees matches what the slider visually shows.
    void load({ test_ratio_min: "0.25", test_ratio_max: "0.50" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void load({
      ecosystems:     draft.ecosystems,
      test_ratio_min: draft.test_ratio_min,
      test_ratio_max: draft.test_ratio_max,
      status:         draft.status,
    });
    // Permanece na aba Filtros; o resultado é sinalizado ali mesmo + no
    // badge da aba Resultados.
    setApplied(true);
  }

  if (error) {
    return (
      <Shell>
        <Section num="01" title={t("directory.error_title")}>
          <EmptyCard>{error}</EmptyCard>
        </Section>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p style={{ color: "var(--muted)", fontSize: 13, padding: "32px 0" }}>{t("directory.loading")}</p>
      </Shell>
    );
  }

  const activeCount = data.results.length;

  return (
    <Shell>
      <DirectoryHero company={data.company.name} total={activeCount} />

      <TabStrip<DirTab>
        tabs={DIR_TABS.map((tab_) => ({
          id:    tab_.id,
          label: t(tab_.labelKey),
          badge: tab_.id === "results" ? activeCount : null,
        })) as readonly TabDef<DirTab>[]}
        active={tab}
        onSelect={selectTab}
        trailing={
          <Tooltip
            tone="ok"
            align="right"
            icon={<VerifiedIcon size={12} />}
            label={t("common.verified.label")}
            title={t("common.verified.title")}
            description={t("directory.verified.desc")}>
            <span aria-label={t("directory.verified.legend_aria")}
                  style={{ display: "inline-flex", alignItems: "center", color: "var(--ok)", cursor: "help" }}>
              <VerifiedIcon size={16} />
            </span>
          </Tooltip>
        } />

      <div className="pt-8">
        {tab === "filters" && (
          <Card>
            <form onSubmit={onSubmit} className="grid gap-5">
              <Field label={t("directory.filter.ecosystems_label")} hint={t("directory.filter.ecosystems_hint")}>
                <EcosystemPicker
                  selected={draft.ecosystems}
                  available={data.available_ecosystems}
                  onChange={(next) => setDraft((d) => ({ ...d, ecosystems: next }))} />
              </Field>

              <Field label={t("directory.filter.test_ratio_label")} hint={t("directory.filter.test_ratio_hint")}>
                <DualRangeSlider
                  min={0} max={1} step={0.05}
                  lo={parseRatio(draft.test_ratio_min, 0)}
                  hi={parseRatio(draft.test_ratio_max, 1)}
                  onChange={(lo, hi) => setDraft((d) => ({
                    ...d,
                    test_ratio_min: lo > 0 ? lo.toFixed(2) : "",
                    test_ratio_max: hi < 1 ? hi.toFixed(2) : "",
                  }))}
                  formatLabel={(v) => `${Math.round(v * 100)}%`} />
              </Field>

              <Field label={t("directory.filter.status_label")}>
                <Dropdown
                  value={draft.status}
                  onChange={(v) => setDraft((d) => ({ ...d, status: v as DirectoryFilters["status"] }))}
                  options={[
                    { value: "all",      label: t("directory.filter.status.all") },
                    { value: "verified", label: t("directory.filter.status.verified") },
                    { value: "outdated", label: t("directory.filter.status.outdated") },
                  ]} />
              </Field>

              <div className="flex flex-wrap items-center" style={{ gap: 14 }}>
                <PrimaryButton type="submit" disabled={busy}>
                  {busy ? t("directory.filter.applying") : t("directory.filter.apply")}
                </PrimaryButton>
                {applied && !busy && (
                  <span className="font-mono" style={{ fontSize: 13, letterSpacing: "0.02em" }}>
                    <strong style={{ color: "var(--accent)", fontFeatureSettings: '"tnum"' }}>
                      {activeCount}
                    </strong>
                    <span style={{ color: "var(--muted)" }}>
                      {" "}{tp("directory.filter.match_count", activeCount)} ·{" "}
                    </span>
                    <button type="button" onClick={() => selectTab("results")} style={inlineLinkBtn()}>
                      {t("directory.filter.see_results")}
                    </button>
                  </span>
                )}
              </div>
            </form>
          </Card>
        )}

        {tab === "results" && (
          data.results.length === 0 ? (
            <EmptyCard>
              {t("directory.results.empty_prefix")}
              <button type="button" onClick={() => selectTab("filters")} style={inlineLinkBtn()}>{t("directory.results.empty_link")}</button>
              {t("directory.results.empty_suffix")}
            </EmptyCard>
          ) : (
            <div className="grid gap-4"
                 style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {data.results.map((dev) => <DevCard key={dev.account_id} dev={dev} />)}
            </div>
          )
        )}
      </div>
    </Shell>
  );
}

function inlineLinkBtn(): React.CSSProperties {
  return {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    font: "inherit", color: "var(--accent)",
    textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
  };
}

// ── chrome ───────────────────────────────────────────────────────────────────

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "64px 32px 96px", color: "var(--text)" }}>
      {children}
    </div>
  );
}

function DirectoryHero({ company, total }: { company: string; total: number }) {
  const t = useT();
  const tp = useTp();
  return (
    <header className="mb-10">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        {t("directory.hero.eyebrow")}
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        {company}
      </h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-3 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        <CompanyNav current="directory" bare />
      </div>
      <div className="mt-2 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        {total === 0 ? t("directory.hero.total_zero") : tp("directory.hero.total", total)}
      </div>
    </header>
  );
}

function Section({ num, title, emTail, right, children }: {
  num: string; title: string; emTail?: string; right?: string; children: ReactNode;
}) {
  return (
    <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
      <div className="mb-8 flex flex-wrap items-baseline gap-6">
        <span className="font-mono uppercase"
              style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}>
          {num}
        </span>
        <h2 className="font-semibold"
            style={{ color: "var(--text)", fontSize: 22, letterSpacing: "-0.02em" }}>
          {title}
          {emTail && <span style={{ color: "var(--muted)", fontWeight: 400 }}> {emTail}</span>}
        </h2>
        {right && (
          <span className="ml-auto font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
            {right}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

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

// ── dev card ──────────────────────────────────────────────────────────────

function DevCard({ dev }: { dev: DevSummary }) {
  const t = useT();
  const fmt = useFmt();
  const portal      = window.location.origin;
  const profileUrl  = dev.slug ? `${portal}/v/${dev.slug}` : null;
  const contactPath = `/accounts/${dev.account_id}/contact`;

  return (
    <div style={{
      position: "relative",
      display: "flex", flexDirection: "column",
      background: "var(--card-bg)",
      border: "1px solid var(--rule)",
      padding: 18,
      minHeight: 188,
    }}>
      {/* selo de verificação — só o ícone no canto; o significado é explicado
          uma vez na legenda do topo (alinhada às tabs). */}
      {dev.status === "verified" && (
        <span aria-label={t("common.verified.aria")}
              style={{ position: "absolute", top: 12, right: 12, display: "inline-flex", color: "var(--ok)" }}>
          <VerifiedIcon size={18} />
        </span>
      )}

      {/* header: handle + status */}
      <div className="flex flex-wrap items-center" style={{ gap: 6, paddingRight: 24 }}>
        <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {dev.handle}
        </span>
        {dev.status === "outdated" && <Badge kind="warn">{t("common.bundle_status.outdated")}</Badge>}
      </div>

      {/* test ratio + última publicação (mono numerics) */}
      <div className="mt-2 font-mono"
           style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.02em",
                     fontFeatureSettings: '"tnum"', lineHeight: 1.6 }}>
        {typeof dev.test_ratio === "number" && (
          <span>{t("directory.card.test_ratio_label")} <strong style={{ color: "var(--accent)" }}>{fmt.percent(dev.test_ratio)}</strong></span>
        )}
        {dev.last_bundle_at && (
          <span> · {t("directory.card.published", { date: fmt.date(dev.last_bundle_at, { month: "short", year: "numeric" }) })}</span>
        )}
      </div>

      {/* ecosystems como chips — carrossel horizontal: quando passam da
          largura do card, rolam (wheel/trackpad ou clicar-e-arrastar) em vez
          de quebrar linha, então a altura do card nunca muda. */}
      {dev.ecosystems.length > 0 && (
        <DragScroll className="mt-3 flex" style={{ gap: 5, flexWrap: "nowrap" }}>
          {dev.ecosystems.map((eco) => (
            <span key={eco} style={{ ...chipStyle(), flex: "0 0 auto", whiteSpace: "nowrap" }}>{eco}</span>
          ))}
        </DragScroll>
      )}

      {/* plataformas em texto discreto */}
      {dev.platforms.length > 0 && (
        <div className="mt-2" style={{ color: "var(--muted-soft)", fontSize: 11.5, lineHeight: 1.6 }}>
          {dev.platforms.slice(0, 4).join(" · ")}
        </div>
      )}

      {/* ações no rodapé do card — link style igual ao CompanyNav */}
      <div className="mt-auto flex flex-wrap items-center font-mono pt-4"
           style={{ gap: 10, fontSize: 12, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
        <SaveDevButton accountId={dev.account_id} />
        <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
        <Link to={contactPath}
              style={{ display: "inline-flex", alignItems: "center", gap: 6,
                       color: "var(--muted)", textDecoration: "none",
                       transition: "color 120ms ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
          <ContactIcon /> {t("directory.card.contact")}
        </Link>
        {profileUrl && (
          <>
            <span aria-hidden="true" style={{ color: "var(--rule)" }}>|</span>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer"
               style={{ display: "inline-flex", alignItems: "center", gap: 6,
                        color: "var(--muted)", textDecoration: "none",
                        transition: "color 120ms ease" }}
               onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
               onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
              <ProfileIcon /> {t("directory.card.view_profile")}
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function chipStyle(): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "2px 9px",
    fontSize: 11.5,
    letterSpacing: "0.01em",
    background: "var(--rule-soft)",
    color: "var(--text)",
    border: "1px solid var(--rule)",
  };
}

// ── primitives ─────────────────────────────────────────────────────────────

function Badge({ kind, children }: { kind: "ok" | "warn"; children: ReactNode }) {
  const palette = kind === "ok"
    ? { bg: "rgba(74,124,78,0.12)", fg: "var(--ok)",   bd: "rgba(74,124,78,0.4)" }
    : { bg: "rgba(181,97,53,0.12)", fg: "var(--warn)", bd: "rgba(181,97,53,0.4)" };
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
        {label}
        {hint && <span style={{ color: "var(--muted-soft)", letterSpacing: 0, textTransform: "none" }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    font: "inherit", fontSize: 14,
    padding: "8px 10px",
    color: "var(--text)", background: "var(--bg)",
    border: "1px solid var(--rule)",
    borderRadius: 0,
    outline: "none",
  };
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
            style={{
              font: "inherit", fontSize: 13,
              padding: "8px 18px",
              background: "var(--text)", color: "var(--bg)",
              border: "1px solid var(--text)",
              borderRadius: 0,
              letterSpacing: "0.02em",
              cursor: props.disabled ? "not-allowed" : "pointer",
              opacity: props.disabled ? 0.5 : 1,
              transition: "background 120ms ease",
              ...(props.style ?? {}),
            }} />
  );
}

// 11px stroke icons matching CompanyNav idiom — leading glyph for the
// link-style action row in result cards.
function ContactIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <rect x="0.5" y="2" width="10" height="7" stroke="currentColor" />
      <path d="M0.5 2.5 L5.5 6 L10.5 2.5" stroke="currentColor" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <circle cx="5.5" cy="3.5" r="2" stroke="currentColor" />
      <path d="M1.5 10.5 C1.5 7.5 3.5 6.5 5.5 6.5 C7.5 6.5 9.5 7.5 9.5 10.5" stroke="currentColor" />
    </svg>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function parseRatio(raw: string, fallback: number): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

// ── DualRangeSlider — two overlapping <input type="range"> with a custom
//    track that highlights the active span. The pointer-events trick lets
//    each thumb stay grabbable while the inputs themselves don't block
//    each other.
//
function DualRangeSlider({ min, max, step, lo, hi, onChange, formatLabel }: {
  min: number; max: number; step: number;
  lo: number; hi: number;
  onChange: (lo: number, hi: number) => void;
  formatLabel?: (v: number) => string;
}) {
  const range = max - min;
  const loPct = ((lo - min) / range) * 100;
  const hiPct = ((hi - min) / range) * 100;
  const label = formatLabel ?? ((v: number) => String(v));

  function setLo(next: number) {
    const clamped = Math.min(next, hi);
    onChange(clamped, hi);
  }
  function setHi(next: number) {
    const clamped = Math.max(next, lo);
    onChange(lo, clamped);
  }

  return (
    <div>
      <div className="mb-2 font-mono"
           style={{ fontSize: 13, color: "var(--text)", letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
        <span style={{ color: "var(--accent)" }}>{label(lo)}</span>
        <span style={{ color: "var(--muted)" }}>  —  </span>
        <span style={{ color: "var(--accent)" }}>{label(hi)}</span>
      </div>

      <div style={{ position: "relative", height: 36, paddingTop: 14 }}>
        {/* track */}
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: 2, background: "var(--rule)", transform: "translateY(-50%)",
        }} />
        {/* active span between lo and hi */}
        <div style={{
          position: "absolute", top: "50%", left: `${loPct}%`, right: `${100 - hiPct}%`,
          height: 2, background: "var(--text)", transform: "translateY(-50%)",
        }} />
        {/* two stacked inputs — pointer-events: none on the input itself,
            ::-webkit-slider-thumb re-enables pointer-events so both thumbs
            stay grabbable. The "above" thumb wins ties (when both meet at
            the same value). */}
        <input type="range" className="dual-range-input"
               min={min} max={max} step={step} value={lo}
               onChange={(e) => setLo(Number(e.target.value))}
               style={rangeStyle({ above: lo > max - step })} />
        <input type="range" className="dual-range-input"
               min={min} max={max} step={step} value={hi}
               onChange={(e) => setHi(Number(e.target.value))}
               style={rangeStyle({ above: true })} />
      </div>

      <div className="mt-1 flex justify-between font-mono"
           style={{ fontSize: 10, color: "var(--muted-soft)", letterSpacing: "0.08em" }}>
        <span>{label(min)}</span>
        <span>{label(max)}</span>
      </div>

      <style>{`
        .dual-range-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px;
          background: var(--bg); border: 1px solid var(--text);
          border-radius: 0; cursor: grab;
          pointer-events: auto;
          margin-top: 0;
        }
        .dual-range-input::-webkit-slider-thumb:active { cursor: grabbing; background: var(--text); }
        .dual-range-input::-moz-range-thumb {
          width: 14px; height: 14px;
          background: var(--bg); border: 1px solid var(--text);
          border-radius: 0; cursor: grab;
          pointer-events: auto;
        }
        .dual-range-input::-webkit-slider-runnable-track { background: transparent; height: 2px; }
        .dual-range-input::-moz-range-track             { background: transparent; height: 2px; }
      `}</style>
    </div>
  );
}

function rangeStyle({ above }: { above: boolean }): React.CSSProperties {
  return {
    position: "absolute", top: "50%", left: 0, right: 0,
    width: "100%", height: 2,
    background: "transparent",
    appearance: "none", WebkitAppearance: "none",
    pointerEvents: "none",
    margin: 0, padding: 0, border: 0,
    transform: "translateY(-50%)",
    zIndex: above ? 2 : 1,
  } as React.CSSProperties;
}

// ── EcosystemPicker — chips for selected, search input that filters the
//    available list AND lets the user add custom values.
//
function EcosystemPicker({ selected, available, onChange }: {
  selected: string[]; available: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const normalizedAvail = available.filter((a) => !selected.includes(a));
  const q = query.trim().toLowerCase();
  const matches = q
    ? normalizedAvail.filter((a) => a.toLowerCase().includes(q))
    : normalizedAvail;
  const showAddCustom = q.length > 0
    && !selected.includes(q)
    && !normalizedAvail.some((a) => a.toLowerCase() === q);

  function add(name: string) {
    const cleaned = name.trim().toLowerCase();
    if (!cleaned || selected.includes(cleaned)) return;
    onChange([...selected, cleaned]);
    setQuery("");
  }
  function remove(name: string) {
    onChange(selected.filter((n) => n !== name));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = q ? q : null;
      if (target) add(target);
    }
    if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  }

  return (
    <div className="grid gap-3">
      {/* selected chips + inline input */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
        padding: "8px 10px", minHeight: 42,
        background: "var(--bg)",
        border: "1px solid var(--rule)",
      }}>
        {selected.map((eco) => (
          <button key={eco} type="button" onClick={() => remove(eco)}
                  className="font-mono uppercase"
                  title="clique para remover"
                  style={{
                    fontSize: 11, letterSpacing: "0.10em",
                    padding: "3px 8px",
                    border: "1px solid var(--text)",
                    background: "var(--text)", color: "var(--bg)",
                    cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
            {eco}
            <span aria-hidden="true" style={{ opacity: 0.7 }}>×</span>
          </button>
        ))}
        <input
          type="text" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? "buscar ou adicionar (ex.: rails, elixir)" : "buscar ou adicionar"}
          style={{
            flex: 1, minWidth: 140,
            font: "inherit", fontSize: 13,
            color: "var(--text)", background: "transparent",
            border: 0, outline: "none",
            padding: "2px 4px",
          }} />
      </div>

      {(matches.length > 0 || showAddCustom) && (
        <div className="flex flex-wrap gap-2">
          {showAddCustom && (
            <button type="button" onClick={() => add(q)}
                    className="font-mono uppercase"
                    title="adicionar ecossistema digitado"
                    style={{
                      fontSize: 11, letterSpacing: "0.10em",
                      padding: "4px 10px",
                      border: "1px dashed var(--accent)",
                      background: "transparent", color: "var(--accent)",
                      cursor: "pointer",
                    }}>
              + {q}
            </button>
          )}
          {matches.map((eco) => (
            <button key={eco} type="button" onClick={() => add(eco)}
                    className="font-mono uppercase"
                    style={{
                      fontSize: 11, letterSpacing: "0.10em",
                      padding: "4px 10px",
                      border: "1px solid var(--rule)",
                      background: "transparent", color: "var(--text)",
                      cursor: "pointer",
                    }}>
              + {eco}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
