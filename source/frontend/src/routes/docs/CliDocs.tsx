import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import {
  fetchBinaryVersion,
  fetchCliDoc,
  listCliVersions,
  type CliVersion,
} from "@/lib/docs/docs-api";
import { parseMarkdown, type ParsedDoc } from "@/lib/docs/markdown";
import { computeSyncStatus, type SyncStatus } from "@/lib/docs/sync-status";

import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { VersionPicker } from "@/components/docs/VersionPicker";
import { MetaStrip } from "@/components/docs/MetaStrip";
import { MarkdownArticle } from "@/components/docs/MarkdownArticle";

import "@/styles/docs/beheld.css";
import "@/styles/docs/app.css";
import "@/styles/docs/app-docs.css";
import "@/styles/docs/cli-article.css";

interface LoadedDoc {
  versions: CliVersion[];
  current: CliVersion;
  parsed: ParsedDoc;
  syncStatus: SyncStatus;
  generatedAt: string;
}

type LoaderResult =
  | { kind: "loading" }
  | { kind: "ok"; data: LoadedDoc }
  | { kind: "error"; status: number; message: string };

const THEME_KEY = "beheld:theme";

function applyStoredTheme() {
  try {
    if (localStorage.getItem(THEME_KEY) === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch {
    /* ignore */
  }
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  if (cur === "light") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem(THEME_KEY, "light");
  }
}

/**
 * View principal — /docs/cli/:version.
 *
 * Carrega versões + markdown + binary version em paralelo, parseia o
 * markdown client-side via parseMarkdown (mesmo pipeline server do dashboard:
 * marked + DOMPurify + liftLabels + colorizePre + addHeadingIds + buildToc).
 * Sem SSR — todo o trabalho acontece no browser.
 */
export function CliDocs() {
  const { version } = useParams<{ version?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.hash || null;

  const [state, setState] = useState<LoaderResult>({ kind: "loading" });
  const [activeId, setActiveId] = useState<string | null>(null);

  // Tema persistido (data-theme="light")
  useEffect(applyStoredTheme, []);

  // Se não há version no path, redireciona para /docs/cli (que redireciona pro latest)
  useEffect(() => {
    if (!version) {
      navigate("/docs/cli", { replace: true });
    }
  }, [version, navigate]);

  // Loader: carrega versões + doc + binary
  useEffect(() => {
    if (!version) return;
    let cancelled = false;

    async function load(v: string) {
      setState({ kind: "loading" });
      const [versionsResult, docResult, binaryResult] = await Promise.all([
        listCliVersions(),
        fetchCliDoc(v),
        fetchBinaryVersion(),
      ]);
      if (cancelled) return;

      if (docResult.kind === "error") {
        setState({ kind: "error", status: docResult.status, message: docResult.message });
        return;
      }
      if (versionsResult.kind === "error") {
        setState({ kind: "error", status: versionsResult.status, message: versionsResult.message });
        return;
      }

      const current = versionsResult.versions.find((x) => x.version === v);
      if (!current) {
        setState({ kind: "error", status: 404, message: "version_not_found" });
        return;
      }

      const parsed = parseMarkdown(docResult.markdown);
      const binary =
        binaryResult.kind === "ok"
          ? { version: binaryResult.version, commit: binaryResult.commit }
          : undefined;
      const syncStatus = computeSyncStatus(
        { version: current.version, commit_sha: current.commit_sha },
        binary,
      );

      setState({
        kind: "ok",
        data: {
          versions: versionsResult.versions,
          current,
          parsed,
          syncStatus,
          generatedAt: new Date(current.published_at).toISOString().slice(0, 10),
        },
      });
    }

    void load(version);
    return () => {
      cancelled = true;
    };
  }, [version]);

  const title = useMemo(
    () => (state.kind === "ok" ? state.data.parsed.title || "Referência do CLI" : "Referência do CLI"),
    [state],
  );

  function onVersionChange(nextVersion: string) {
    navigate(`/docs/cli/${nextVersion}`);
  }

  return (
    <div className="app">
      <header className="app__top">
        <div className="app__brand">
          <span aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 120 120" fill="none">
              <path d="M46 28 H30 V92 H46" stroke="currentColor" strokeWidth="8" fill="none" />
              <path d="M74 28 H90 V92 H74" stroke="currentColor" strokeWidth="8" fill="none" />
              <rect className="cur" x="53" y="45" width="14" height="30" fill="currentColor">
                <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.15s" repeatCount="indefinite" />
              </rect>
            </svg>
          </span>
          <span className="lk-word"><span className="b">b</span>eheld</span>
          <span className="crumb">/ docs / <b>cli{version ? ` · v${version}` : ""}</b></span>
        </div>
        <div className="app__user">
          <button type="button" className="theme-toggle" aria-label="alternar tema" onClick={toggleTheme}>
            <svg className="moon" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M10 7.2a4 4 0 1 1-5.2-5.2 4 4 0 0 0 5.2 5.2z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <svg className="sun" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M6 .8v1.6M6 9.6v1.6M.8 6h1.6M9.6 6h1.6M2.3 2.3l1.1 1.1M8.6 8.6l1.1 1.1M2.3 9.7l1.1-1.1M8.6 3.4l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="label">tema</span>
          </button>
          <span className="dot"></span>
          <span>dashboard</span>
        </div>
      </header>

      <aside className="app__side">
        <p className="sec">documentação · cli</p>
        {state.kind === "ok" ? (
          <DocsSidebar toc={state.data.parsed.toc} activeId={activeId} />
        ) : (
          <div className="docs-loading"><span className="spinner"></span> carregando…</div>
        )}
      </aside>

      <main className="app__main">
        <div className="wrap-inner">
          {state.kind === "loading" && (
            <div className="docs-loading"><span className="spinner"></span> carregando referência do CLI…</div>
          )}

          {state.kind === "error" && (
            <div className="docs-error">
              <b>Falha ao carregar a referência (HTTP {state.status})</b>
              <div>Detalhe: <code>{state.message}</code></div>
            </div>
          )}

          {state.kind === "ok" && (
            <>
              <header className="page-h">
                <div>
                  <p className="docs-h__eb">
                    <span>documentação</span> <span className="sl">/</span>{" "}
                    <span>referência</span> <span className="sl">/</span>{" "}
                    <span className="sig">cli</span>
                  </p>
                  <h1>{title}</h1>
                  <p className="docs-h__sub">{state.data.parsed.subtitle}</p>
                </div>
                <VersionPicker
                  versions={state.data.versions}
                  current={state.data.current.version}
                  onChange={onVersionChange}
                />
              </header>

              <MetaStrip
                source={`cli-references-v${state.data.current.version.replace(/\./g, "-")}.md`}
                commitSha={state.data.current.commit_sha}
                generatedAt={state.data.generatedAt}
                syncStatus={state.data.syncStatus}
              />

              <div className="docs" style={{ marginTop: 28 }}>
                <MarkdownArticle
                  html={state.data.parsed.html}
                  hash={hash}
                  onActiveIdChange={setActiveId}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * /docs/cli — sem version. Redireciona para a versão "latest" (ou mais
 * recente). Renderiza loading enquanto resolve.
 */
export function CliDocsRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listCliVersions();
      if (cancelled) return;
      if (result.kind === "error" || result.versions.length === 0) {
        setError("no_docs_published");
        return;
      }
      const latest = result.versions.find((v) => v.tag === "latest") ?? result.versions[0];
      navigate(`/docs/cli/${latest.version}`, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="app">
        <main className="app__main">
          <div className="wrap-inner">
            <div className="docs-error">
              <b>Nenhuma versão da referência do CLI publicada.</b>
              <p>
                Rode <code>bundle exec rails docs:cli:ingest</code> no backend para
                popular a primeira versão.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="app__main">
        <div className="wrap-inner">
          <div className="docs-loading"><span className="spinner"></span> carregando…</div>
        </div>
      </main>
    </div>
  );
}
