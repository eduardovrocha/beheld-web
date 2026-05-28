/**
 * PF.4 — Hierarchical location picker (region → country → state → city).
 *
 * Cascading <select>s driven by a static dataset (no network). Each level
 * only renders once its parent is chosen:
 *   - "Remote" short-circuits levels 2–4 → { region: "remote" }
 *   - the state level is hidden for countries with a single (or no) state;
 *     in that case the lone state is auto-selected so cities still resolve
 *     (spec §5.3 + stop-and-ask: never render a state dropdown with no states)
 *
 * Stored shape (jsonb on positions.location):
 *   { region, country, state, city }   structured
 *   { region: "remote" }               remote
 *   { raw: "..." }                     legacy rows (display-only, see formatLocation)
 */
import { useMemo } from "react";

import type { PositionLocation } from "@/lib/companyDashboardApi";
import locations from "@/data/locations.json";

interface CityState { code: string; label: string; cities: string[] }
interface Country   { code: string; label: string; states: CityState[] }
interface Region    { key: string; label: string; countries: Country[] }

const REGIONS = (locations as { regions: Region[] }).regions;

export function LocationPicker({ value, disabled, onChange }: {
  value:    PositionLocation;
  disabled?: boolean;
  onChange: (loc: PositionLocation) => void;
}) {
  const region  = value.region  ?? "";
  const country = value.country ?? "";
  const state   = value.state   ?? "";
  const city    = value.city    ?? "";

  const selectedRegion  = useMemo(() => REGIONS.find((r) => r.key === region), [region]);
  const countries       = selectedRegion?.countries ?? [];
  const selectedCountry = useMemo(() => countries.find((c) => c.code === country), [countries, country]);
  const states          = selectedCountry?.states ?? [];
  const selectedState   = states.find((s) => s.code === state);
  const cities          = selectedState?.cities ?? [];

  function handleRegion(val: string) {
    onChange(val === "remote" ? { region: "remote" } : val ? { region: val } : {});
  }

  function handleCountry(val: string) {
    if (!val) { onChange({ region }); return; }
    const c = countries.find((x) => x.code === val);
    // Single-state countries (e.g. Singapura): auto-select the lone state so
    // the city dropdown resolves without ever showing a state picker.
    const next: PositionLocation = { region, country: val };
    if (c && c.states.length === 1) next.state = c.states[0].code;
    onChange(next);
  }

  function handleState(val: string) {
    onChange(val ? { region, country, state: val } : { region, country });
  }

  function handleCity(val: string) {
    onChange(val ? { region, country, state, city: val } : { region, country, state });
  }

  const showCountry = region !== "" && region !== "remote";
  const showState   = showCountry && country !== "" && states.length > 1;
  const showCity    = showCountry && country !== "" && cities.length > 0;

  return (
    <div className="grid gap-2">
      <select value={region} disabled={disabled}
              onChange={(e) => handleRegion(e.target.value)} style={selectStyle(disabled)}>
        <option value="">Selecione a região</option>
        {REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
      </select>

      {showCountry && (
        <select value={country} disabled={disabled}
                onChange={(e) => handleCountry(e.target.value)} style={selectStyle(disabled)}>
          <option value="">Selecione o país</option>
          {countries.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      )}

      {showState && (
        <select value={state} disabled={disabled}
                onChange={(e) => handleState(e.target.value)} style={selectStyle(disabled)}>
          <option value="">Selecione o estado / província</option>
          {states.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
      )}

      {showCity && (
        <select value={city} disabled={disabled}
                onChange={(e) => handleCity(e.target.value)} style={selectStyle(disabled)}>
          <option value="">Selecione a cidade</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
    </div>
  );
}

// PF.11 — display helper used wherever a position location is rendered.
// Resolves the country code back to its label and degrades gracefully:
//   { raw }            → the raw string (legacy rows)
//   { region:"remote"} → "Remote"
//   structured         → "Cidade, ST — País"  (whatever levels are present)
//   {}                 → "—"
export function formatLocation(loc?: PositionLocation | null): string {
  if (!loc || Object.keys(loc).length === 0) return "—";
  if (loc.raw) return loc.raw;
  if (loc.region === "remote") return "Remote";

  const regionObj  = REGIONS.find((r) => r.key === loc.region);
  const countryObj = regionObj?.countries.find((c) => c.code === loc.country);
  const head = [loc.city, loc.state].filter(Boolean).join(", ");

  if (head && countryObj) return `${head} — ${countryObj.label}`;
  if (head)               return head;
  if (countryObj)         return countryObj.label;
  if (regionObj)          return regionObj.label;
  return "—";
}

function selectStyle(disabled?: boolean): React.CSSProperties {
  return {
    font: "inherit", fontSize: 14,
    padding: "8px 10px",
    color: "var(--text)", background: "var(--bg)",
    border: "1px solid var(--rule)",
    borderRadius: 0, outline: "none",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
