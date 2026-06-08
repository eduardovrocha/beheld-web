import { useEffect, useMemo, useRef, useState } from "react";
import type { TocGroup } from "@/lib/docs/build-toc";
import { renderTocLabel } from "@/lib/docs/render-toc-label";

interface DocsSidebarProps {
  toc: TocGroup[];
  activeId: string | null;
}

function matches(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function DocsSidebar({ toc, activeId }: DocsSidebarProps) {
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visibleGroups = useMemo(() => {
    if (!filter) return toc;
    return toc
      .map((g) => {
        const filteredChildren = g.children.filter((c) => matches(c.title, filter));
        const groupMatches = matches(g.title, filter);
        if (groupMatches) return { ...g, children: filteredChildren.length ? filteredChildren : g.children };
        if (filteredChildren.length) return { ...g, children: filteredChildren };
        return null;
      })
      .filter((g): g is TocGroup => g !== null);
  }, [toc, filter]);

  return (
    <>
      <button
        type="button"
        className={`docs-trigger ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="docsTree"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ic" aria-hidden="true">
          {/* placeholder icon — pode trocar pelo SVG do mockup */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 2.5h11v11h-11z" stroke="currentColor" />
            <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" />
          </svg>
        </span>
        Documentação
        <span className="chev" aria-hidden="true">▾</span>
      </button>

      <div
        id="docsTree"
        className={`app__side__docs ${open ? "" : "is-collapsed"}`}
      >
        <div className="docs-search">
          <span className="ic">/</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="filtrar…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoComplete="off"
          />
          <span className="kbd">⌘K</span>
        </div>

        <div id="tocList">
          {visibleGroups.map((group) => {
            const isActiveGroup = activeId === group.id;
            if (group.kind === "h2-only") {
              return (
                <a
                  key={group.id || "_orphan"}
                  href={`#${group.id}`}
                  data-id={group.id}
                  className={`toc__h2 ${isActiveGroup ? "active" : ""}`}
                >
                  {group.title}
                </a>
              );
            }
            return (
              <div key={group.id || "_orphan"}>
                {group.id ? (
                  <a
                    href={`#${group.id}`}
                    data-id={group.id}
                    className={`toc__sec toc__sec--link ${isActiveGroup ? "active" : ""}`}
                  >
                    {group.title}
                  </a>
                ) : (
                  <div className="toc__sec">{group.title}</div>
                )}
                {group.children.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#${c.id}`}
                      data-id={c.id}
                      className={isActive ? "active" : ""}
                      dangerouslySetInnerHTML={{ __html: renderTocLabel(c.title) }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
