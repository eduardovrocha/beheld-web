import { useEffect, useRef, useState } from "react";
import type { CliVersion } from "@/lib/docs/docs-api";

interface VersionPickerProps {
  versions: CliVersion[];
  current: string;
  onChange: (version: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun",
                  "jul", "ago", "set", "out", "nov", "dez"];
  const month = months[d.getUTCMonth()];
  return `${day} ${month}`;
}

function shortCommit(sha: string): string {
  return sha.slice(0, 7);
}

export function VersionPicker({ versions, current, onChange }: VersionPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentEntry = versions.find((v) => v.version === current);
  const isLatest = currentEntry?.tag === "latest";

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  function selectVersion(version: string) {
    onChange(version);
    setOpen(false);
  }

  return (
    <div className={`ver ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`ver__btn ${open ? "is-open" : ""}`}
        aria-label="versão"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span>
          <span className="ver__lab">versão</span>
          <br />
          <span className="ver__cur">
            {current ? `v${current}` : "—"}
            {isLatest && <span className="pill"> latest</span>}
          </span>
        </span>
        <span className="ver__caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="ver__menu" role="listbox" aria-label="Versões disponíveis">
          {versions.map((v) => {
            const selected = v.version === current;
            return (
              <div
                key={v.version}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                className={`ver__opt ${selected ? "is-selected" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  selectVersion(v.version);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectVersion(v.version);
                  }
                }}
              >
                <span className="v">v{v.version}</span>
                <span className="when">
                  {formatDate(v.published_at)} · commit {shortCommit(v.commit_sha)}
                </span>
                <span className={`tag tag--${v.tag ?? "none"}`}>{v.tag ?? "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
