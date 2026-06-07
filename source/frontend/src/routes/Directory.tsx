/**
 * /directory — recruiter-facing searchable dev directory, app-shell v2
 * (design_handoff_empresa, "Page :: Directory"). Renders OUTSIDE
 * <Layout>; shares CompanyShell with /company/dashboard.
 *
 * Two-pane layout (.dir): filters left (ecosystem chips + busca,
 * accessible dual-range test ratio, status select, aplicar/limpar) and
 * results right (sortable dcard grid). Server-side filtering via
 * GET /api/v1/directory (existing API: ecosystems[], test_ratio_min/max,
 * status); sorting is client-side. "Exportar lista" baixa um CSV dos
 * resultados atuais.
 */
import { useMemo, useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PageHeader, ShellButton } from "@/components/app/PageHeader";
import { CompanyShell } from "@/components/company/CompanyShell";
import { useT, useFmt } from "@/i18n/I18nProvider";
import {
  getDirectory,
  DirectoryAuthError,
  type DevSummary,
  type DirectoryFilters,
  type DirectoryPayload,
  type DirectoryQuery,
} from "@/lib/directoryApi";
import { saveDev, CompanyAuthError } from "@/lib/companyDashboardApi";

import "@/styles/app-shell.css";
import "@/styles/app-company.css";

// Default test ratio window (matches the previous directory behaviour):
// weeds out bundles with no test discipline and auto-generated outliers.
const DEFAULT_MIN = "0.25";
const DEFAULT_MAX = "0.50";

type SortKey = "test_ratio" | "recency" | "handle";

export function Directory() {
  const navigate = useNavigate();
  const t = useT();
  const [data, setData]   = useState<DirectoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  const [sort, setSort]   = useState<SortKey>("test_ratio");

  const [draft, setDraft] = useState<DirectoryFilters>({
    ecosystems: [], test_ratio_min: DEFAULT_MIN, test_ratio_max: DEFAULT_MAX, status: "all",
  });

  useEffect(() => {
    document.documentElement.classList.add("app-v2-page");
    return () => document.documentElement.classList.remove("app-v2-page");
  }, []);

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
    void load({ test_ratio_min: DEFAULT_MIN, test_ratio_max: DEFAULT_MAX });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(e: FormEvent) {
    e.preventDefault();
    void load({
      ecosystems:     draft.ecosystems,
      test_ratio_min: draft.test_ratio_min,
      test_ratio_max: draft.test_ratio_max,
      status:         draft.status,
    });
  }

  function clearFilters() {
    setDraft({ ecosystems: [], test_ratio_min: "", test_ratio_max: "", status: "all" });
    void load({});
  }

  const results = useMemo(() => sortResults(data?.results ?? [], sort), [data, sort]);
  const total = results.length;

  const activeFilterCount =
    draft.ecosystems.length
    + (draft.test_ratio_min || draft.test_ratio_max ? 1 : 0)
    + (draft.status !== "all" ? 1 : 0);

  return (
    <CompanyShell page="directory" companyName={data?.company.name ?? null}
                  crumbExtra="directory"
                  counts={data ? { directory: total } : undefined}>
      <PageHeader
        eyebrow={["empresa", data?.company.name ?? "—", "directory"]}
        title={t("directory.shell.h1")}
        subtitle={t("directory.shell.sub", { count: total })}
        cta={
          <>
            <ShellButton onClick={() => exportCsv(results)} disabled={total === 0}>
              {t("directory.shell.cta.export")}
            </ShellButton>
            <ShellButton primary disabled title={t("company.shell.soon")}>
              {t("directory.shell.cta.save_search")}
            </ShellButton>
          </>
        }
      />

      {error && (
        <p style={{ color: "var(--amber)", fontFamily: "var(--mono)", fontSize: 12.5, padding: "16px 0" }}>
          {error}
        </p>
      )}
      {!data && !error && <p className="app__loading">{t("directory.loading")}</p>}

      {data && (
        <div className="dir">
          <FiltersPanel draft={draft} setDraft={setDraft}
                        available={data.available_ecosystems}
                        activeCount={activeFilterCount}
                        busy={busy}
                        onApply={apply} onClear={clearFilters} />

          <section>
            <div className="dir-res-h">
              <h3>{t("directory.shell.results")} <b>{total}</b></h3>
              <label className="sort">
                {t("directory.shell.sort_label")}
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="test_ratio">{t("directory.shell.sort.test_ratio")}</option>
                  <option value="recency">{t("directory.shell.sort.recency")}</option>
                  <option value="handle">{t("directory.shell.sort.handle")}</option>
                </select>
              </label>
            </div>

            {total === 0 ? (
              <div style={{ border: "1px solid var(--line)", background: "var(--surface)", padding: 22 }}>
                <p style={{ color: "var(--ink-3)", fontSize: 13.5, margin: 0 }}>
                  {t("directory.shell.empty")}
                </p>
              </div>
            ) : (
              <div className="dir-grid">
                {results.map((dev) => <DevCard key={dev.account_id} dev={dev} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </CompanyShell>
  );
}

// ── sorting / export ────────────────────────────────────────────────────────

function sortResults(results: DevSummary[], sort: SortKey): DevSummary[] {
  const arr = [...results];
  switch (sort) {
    case "test_ratio":
      return arr.sort((a, b) => (b.test_ratio ?? -1) - (a.test_ratio ?? -1));
    case "recency":
      return arr.sort((a, b) => (b.last_bundle_at ?? "").localeCompare(a.last_bundle_at ?? ""));
    case "handle":
      return arr.sort((a, b) => a.handle.localeCompare(b.handle));
  }
}

function exportCsv(results: DevSummary[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    "handle,status,test_ratio,ecosystems,platforms,last_bundle_at",
    ...results.map((d) => [
      esc(d.handle),
      d.status ?? "",
      d.test_ratio ?? "",
      esc(d.ecosystems.join(" ")),
      esc(d.platforms.join(" ")),
      d.last_bundle_at ?? "",
    ].join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "beheld-directory.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── filters panel ───────────────────────────────────────────────────────────

function FiltersPanel({ draft, setDraft, available, activeCount, busy, onApply, onClear }: {
  draft: DirectoryFilters;
  setDraft: React.Dispatch<React.SetStateAction<DirectoryFilters>>;
  available: string[];
  activeCount: number;
  busy: boolean;
  onApply: (e: FormEvent) => void;
  onClear: () => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");

  // Chips = união (disponíveis + selecionados custom), filtrada pela busca.
  const chips = useMemo(() => {
    const all = [...new Set([...available, ...draft.ecosystems])];
    const q = query.trim().toLowerCase();
    return q ? all.filter((c) => c.toLowerCase().includes(q)) : all;
  }, [available, draft.ecosystems, query]);

  function toggle(eco: string) {
    setDraft((d) => ({
      ...d,
      ecosystems: d.ecosystems.includes(eco)
        ? d.ecosystems.filter((e) => e !== eco)
        : [...d.ecosystems, eco],
    }));
  }

  function addCustom() {
    const eco = query.trim().toLowerCase();
    if (!eco) return;
    if (!draft.ecosystems.includes(eco)) toggle(eco);
    setQuery("");
  }

  const lo = parseRatio(draft.test_ratio_min, 0);
  const hi = parseRatio(draft.test_ratio_max, 1);

  return (
    <form className="filters" onSubmit={onApply}>
      <h2>
        {t("directory.shell.filters")}
        {activeCount > 0 && <span className="ct">{t("directory.shell.filters_active", { count: activeCount })}</span>}
      </h2>

      <div className="filters__b">
        <fieldset>
          <legend>{t("directory.filter.ecosystems_label")}</legend>
          <p className="hint">{t("directory.filter.ecosystems_hint")}</p>
          <div className="search">
            <span className="glyph" aria-hidden="true">⌕</span>
            <input value={query}
                   placeholder={t("directory.shell.search_placeholder")}
                   aria-label={t("directory.filter.ecosystems_label")}
                   onChange={(e) => setQuery(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
          </div>
          <div className="chips">
            {chips.map((eco) => {
              const on = draft.ecosystems.includes(eco);
              return (
                <button key={eco} type="button" className={`chip${on ? " on" : ""}`}
                        aria-pressed={on} onClick={() => toggle(eco)}>
                  <span className="plus" aria-hidden="true">{on ? "✓" : "+"}</span>{eco}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t("directory.filter.test_ratio_label")}</legend>
          <p className="hint">{t("directory.filter.test_ratio_hint")}</p>
          <RangeDual lo={lo} hi={hi}
                     onChange={(nlo, nhi) => setDraft((d) => ({
                       ...d,
                       test_ratio_min: nlo > 0 ? nlo.toFixed(2) : "",
                       test_ratio_max: nhi < 1 ? nhi.toFixed(2) : "",
                     }))} />
        </fieldset>

        <fieldset>
          <legend>{t("directory.filter.status_label")}</legend>
          <select value={draft.status}
                  aria-label={t("directory.filter.status_label")}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as DirectoryFilters["status"] }))}>
            <option value="all">{t("directory.filter.status.all")}</option>
            <option value="verified">{t("directory.filter.status.verified")}</option>
            <option value="outdated">{t("directory.filter.status.outdated")}</option>
          </select>
        </fieldset>
      </div>

      <div className="filters__foot">
        <button type="button" className="clear" onClick={onClear}>{t("directory.shell.clear")}</button>
        <ShellButton primary type="submit" disabled={busy}>
          {busy ? t("directory.filter.applying") : t("directory.filter.apply")}
        </ShellButton>
      </div>
    </form>
  );
}

function parseRatio(raw: string, fallback: number): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
}

/**
 * Accessible dual-handle range: two native `<input type="range">` stacked
 * on a shared visual track (per the handoff's a11y note). Keyboard works
 * out of the box; each handle carries its own aria-label.
 */
function RangeDual({ lo, hi, onChange }: {
  lo: number; hi: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const t = useT();
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div className="range">
      <div className="range__cur">
        <span>{pct(lo)}</span>
        <span>{pct(hi)}</span>
      </div>
      <div className="range__track">
        <span className="sel" style={{ left: pct(lo), right: `${100 - Math.round(hi * 100)}%` }} aria-hidden="true" />
        <input type="range" min={0} max={1} step={0.05} value={lo}
               aria-label={t("directory.shell.range_min")}
               onChange={(e) => onChange(Math.min(Number(e.target.value), hi), hi)} />
        <input type="range" min={0} max={1} step={0.05} value={hi}
               aria-label={t("directory.shell.range_max")}
               onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo))} />
      </div>
      <div className="range__labs"><span>0%</span><span>100%</span></div>
    </div>
  );
}

// ── result card ─────────────────────────────────────────────────────────────

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
}

function DevCard({ dev }: { dev: DevSummary }) {
  const t = useT();
  const fmt = useFmt();
  const days = daysSince(dev.last_bundle_at);
  const tierCls = dev.status === "verified" ? "tier--2" : dev.status === "outdated" ? "tier--1" : "tier--0";
  const tierLabel = dev.status ? t(`common.bundle_status.${dev.status}`) : "—";

  return (
    <article className="dcard">
      <div className="dcard__top">
        <span className="dcard__h">@{dev.handle.replace(/^@/, "")}</span>
        <span className={`dcard__tier ${tierCls}`}>{tierLabel}</span>
      </div>

      <div className="dcard__mini">
        <div>
          <span className="k">test ratio</span>
          <span className={`v${(dev.test_ratio ?? 0) >= 0.3 ? " ok" : ""}`}>
            {dev.test_ratio != null ? fmt.percent(dev.test_ratio) : "—"}
          </span>
        </div>
        <div>
          <span className="k">{t("directory.shell.card.ecos")}</span>
          <span className="v">{dev.ecosystems.length}</span>
        </div>
        <div>
          <span className="k">{t("directory.shell.card.last_bundle")}</span>
          <span className="v">{days != null ? `${days}d` : "—"}</span>
        </div>
      </div>

      {dev.ecosystems.length > 0 && (
        <div className="dcard__eco">
          {dev.ecosystems.slice(0, 4).map((eco) => <span key={eco}>{eco}</span>)}
        </div>
      )}

      <div className="dcard__foot">
        <span>{days != null ? t("directory.shell.card.seen", { days }) : "—"}</span>
        <span className="links">
          <DcardSave accountId={dev.account_id} />
          <Link to={`/accounts/${dev.account_id}/contact`}>{t("directory.card.contact")}</Link>
          {dev.slug && (
            <a href={`/v/${dev.slug}`} target="_blank" rel="noreferrer">
              {t("directory.shell.card.profile")}
            </a>
          )}
        </span>
      </div>
    </article>
  );
}

function DcardSave({ accountId }: { accountId: number }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function handle() {
    setState("busy");
    try {
      await saveDev(accountId, null);
      setState("saved");
    } catch (e) {
      setState(e instanceof CompanyAuthError ? "error" : "error");
    }
  }

  if (state === "saved") return <span className="saved">✓ {t("company.save_dev.saved")}</span>;
  return (
    <button type="button" disabled={state === "busy"} onClick={() => void handle()}>
      {state === "error" ? t("company.save_dev.failed") : t("company.save_dev.cta")}
    </button>
  );
}
