/**
 * Recruiter directory (`/directory`).
 *
 * Same visual vocabulary as Dashboard — Switzer body, mono uppercase
 * section labels, white cards with rule hairlines, accent gold for
 * numerics. Auth via signed company cookie set by
 * `POST /api/v1/sessions/company/verify`.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { SaveDevButton } from "@/components/company/SaveDevButton";
import {
  getDirectory,
  DirectoryAuthError,
  type DevSummary,
  type DirectoryFilters,
  type DirectoryPayload,
  type DirectoryQuery,
} from "@/lib/directoryApi";

const PT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function shortMonthYear(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${PT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function Directory() {
  const navigate = useNavigate();
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
  }

  if (error) {
    return (
      <Shell>
        <Section num="01" title="Falha no diretório">
          <EmptyCard>{error}</EmptyCard>
        </Section>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p style={{ color: "var(--muted)", fontSize: 13, padding: "32px 0" }}>Carregando diretório…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <DirectoryHero company={data.company.name} total={data.results.length} />

      <Section num="01" title="Filtros" emTail="· sinais reais, não palavras-chave">
        <Card>
          <form onSubmit={onSubmit} className="grid gap-5">
            <Field label="Ecossistemas / linguagens" hint="qualquer um dos selecionados">
              <EcosystemPicker
                selected={draft.ecosystems}
                available={data.available_ecosystems}
                onChange={(next) => setDraft((d) => ({ ...d, ecosystems: next }))} />
            </Field>

            <Field label="Test ratio" hint="proporção de arquivos de teste por arquivo de código">
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

            <Field label="Status do bundle">
              <Dropdown
                value={draft.status}
                onChange={(v) => setDraft((d) => ({ ...d, status: v as DirectoryFilters["status"] }))}
                options={[
                  { value: "all",      label: "Todos" },
                  { value: "verified", label: "Verificados (≤ 30 dias)" },
                  { value: "outdated", label: "Desatualizados (> 30 dias)" },
                ]} />
            </Field>

            <div>
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? "Aplicando…" : "Aplicar filtros"}
              </PrimaryButton>
            </div>
          </form>
        </Card>
      </Section>

      <Section num="02" title="Resultados"
               emTail="· devs encontráveis"
               right={`${data.results.length} ${data.results.length === 1 ? "perfil" : "perfis"}`}>
        {data.results.length === 0 ? (
          <EmptyCard>Nenhum dev encontrado com esses critérios.</EmptyCard>
        ) : (
          <Card padded={false}>
            {data.results.map((dev, i) => <DevRow key={dev.account_id} dev={dev} first={i === 0} />)}
          </Card>
        )}
      </Section>
    </Shell>
  );
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
  return (
    <header className="mb-12">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        empresa · diretório
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        {company}
      </h1>
      <div className="mt-3 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        {total === 0 ? "nenhum perfil ativo no momento" : `${total} ${total === 1 ? "perfil ativo" : "perfis ativos"}`}
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

// ── dev row ─────────────────────────────────────────────────────────────────

function DevRow({ dev, first }: { dev: DevSummary; first: boolean }) {
  const portal      = window.location.origin;
  const profileUrl  = dev.slug ? `${portal}/v/${dev.slug}` : null;
  const contactPath = `/accounts/${dev.account_id}/contact`;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto",
      gap: 16, padding: "16px 20px",
      borderTop: first ? "none" : "1px solid var(--rule-soft)",
      alignItems: "start",
    }}>
      <div>
        <div style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.6 }}>
          {dev.handle}
          {dev.status === "verified" && <Badge kind="ok">verificado</Badge>}
          {dev.status === "outdated" && <Badge kind="warn">desatualizado</Badge>}
        </div>
        <div className="mt-1" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.75 }}>
          {dev.ecosystems.length > 0 && (
            <><strong style={{ color: "var(--text)" }}>Ecossistemas:</strong> {dev.ecosystems.slice(0, 3).join(", ")}</>
          )}
          {dev.platforms.length > 0 && (
            <> · <strong style={{ color: "var(--text)" }}>Plataformas:</strong> {dev.platforms.slice(0, 3).join(", ")}</>
          )}
        </div>
        <div className="mt-1" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.75, fontFeatureSettings: '"tnum"' }}>
          {typeof dev.test_ratio === "number" && (
            <><strong style={{ color: "var(--text)" }}>Test ratio:</strong> {Math.round(dev.test_ratio * 100)}%</>
          )}
          {dev.last_bundle_at && (
            <> · <strong style={{ color: "var(--text)" }}>Última publicação:</strong> {shortMonthYear(dev.last_bundle_at)}</>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-start gap-2">
        {profileUrl && (
          <a href={profileUrl} style={linkButtonStyle({ primary: false })}>
            Ver perfil →
          </a>
        )}
        <SaveDevButton accountId={dev.account_id} size="sm" />
        <Link to={contactPath} style={linkButtonStyle({ primary: true })}>
          Contatar
        </Link>
      </div>
    </div>
  );
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

function linkButtonStyle({ primary }: { primary: boolean }): React.CSSProperties {
  return {
    font: "inherit", fontSize: 12.5,
    padding: "6px 14px",
    background:  primary ? "var(--text)" : "transparent",
    color:       primary ? "var(--bg)"   : "var(--text)",
    border:      `1px solid ${primary ? "var(--text)" : "var(--rule)"}`,
    borderRadius: 0,
    letterSpacing: "0.02em",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
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

// ── Dropdown — fully custom (not <select>) so the menu panel uses the same
//    hairline + chip vocabulary as the rest of the page. Closes on outside
//    click and Escape; arrow keys + Enter for keyboard nav. The trigger
//    looks like an Input field with a chevron; the panel is a white card
//    with mono uppercase options that invert on hover.
//
function Dropdown({ value, onChange, options }: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [open, setOpen]               = useState(false);
  const [focusIndex, setFocusIndex]   = useState(-1);
  const containerRef                  = useRef<HTMLDivElement>(null);
  const selected                      = options.find((o) => o.value === value) ?? options[0];

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(options.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter" && focusIndex >= 0) {
        e.preventDefault();
        onChange(options[focusIndex].value);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown",   onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown",   onKeyDown);
    };
  }, [open, focusIndex, options, onChange]);

  function toggle() {
    setOpen((v) => {
      if (!v) setFocusIndex(Math.max(0, options.findIndex((o) => o.value === value)));
      return !v;
    });
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: 360 }}>
      {/* trigger */}
      <button type="button" onClick={toggle}
              aria-haspopup="listbox" aria-expanded={open}
              style={{
                font: "inherit", fontSize: 14,
                padding: "8px 12px",
                color: "var(--text)", background: "var(--bg)",
                border: "1px solid var(--rule)",
                borderRadius: 0,
                outline: "none",
                cursor: "pointer",
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12,
                letterSpacing: "0.01em",
              }}>
        <span style={{ color: "var(--text)" }}>{selected.label}</span>
        <span aria-hidden="true"
              className="font-mono"
              style={{
                color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 120ms ease",
                display: "inline-block",
              }}>
          ▾
        </span>
      </button>

      {/* panel */}
      {open && (
        <ul role="listbox"
            style={{
              position: "absolute", top: "calc(100% - 1px)", left: 0, right: 0,
              margin: 0, padding: 0,
              listStyle: "none",
              background: "var(--card-bg)",
              border: "1px solid var(--rule)",
              zIndex: 50,
              boxShadow: "0 12px 28px -16px rgba(0,0,0,0.25)",
            }}>
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isFocused  = i === focusIndex;
            return (
              <li key={o.value}
                  role="option" aria-selected={isSelected}
                  onMouseEnter={() => setFocusIndex(i)}
                  onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: 13.5,
                    color:      isFocused ? "var(--bg)"   : "var(--text)",
                    background: isFocused ? "var(--text)" : "transparent",
                    display: "flex", alignItems: "center", gap: 10,
                    borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
                  }}>
                <span className="font-mono"
                      style={{
                        fontSize: 10, letterSpacing: "0.14em",
                        color: isSelected
                          ? (isFocused ? "var(--bg)" : "var(--accent)")
                          : (isFocused ? "var(--bg)" : "var(--muted)"),
                        width: 12,
                      }}>
                  {isSelected ? "●" : "○"}
                </span>
                <span style={{ flex: 1 }}>{o.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
