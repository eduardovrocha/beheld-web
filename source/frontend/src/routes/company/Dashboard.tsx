/**
 * /company/dashboard — the recruiter's record of what already happened.
 * Distinct from /directory (active search) — here you see totals, the
 * activity feed, the messages you've sent, the devs you bookmarked, and
 * the positions you're hiring for.
 *
 * Tabs (URL-hash synced so deep links to a specific section work):
 *   #visao-geral, #atividade, #mensagens, #devs, #posicoes
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { TabStrip, type TabDef } from "@/components/TabStrip";
import { CompanyNav } from "@/components/company/CompanyNav";
import { MessagesList } from "@/components/company/MessagesList";
import { PositionsList } from "@/components/company/PositionsList";
import { RecentActivity } from "@/components/company/RecentActivity";
import { SavedDevsList } from "@/components/company/SavedDevsList";
import { StatsGrid } from "@/components/company/StatsGrid";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";

type TabId = "overview" | "activity" | "messages" | "devs" | "positions";

const TABS: Array<{ id: TabId; label: string; hash: string; subtitle: string }> = [
  // TEMP: abas "Visão geral" e "Atividade recente" ocultas temporariamente.
  // Descomentar reativa cada tab; os renders (`active === "overview" | "activity"`)
  // seguem intactos. O fallback de tabFromHash usa TABS[0] dinamicamente.
  // { id: "overview",  label: "Visão geral",            hash: "#visao-geral", subtitle: "totais e taxa de resposta" },
  // { id: "activity",  label: "Atividade recente",      hash: "#atividade",   subtitle: "verificações e mensagens" },
  { id: "messages",  label: "Mensagens",              hash: "#mensagens",   subtitle: "tudo que sua empresa enviou" },
  { id: "devs",      label: "Devs salvos",            hash: "#devs",        subtitle: "bookmarks privados da empresa" },
  { id: "positions", label: "Posições disponíveis",   hash: "#posicoes",    subtitle: "vagas abertas para captação" },
];

export function CompanyDashboardPage() {
  const navigate = useNavigate();
  const {
    stats, recentActivity, messages, savedDevs, positions,
    loading, error, authRequired,
    updateNote, removeSavedDev,
    createPosition, updatePosition, archivePosition, reactivatePosition, purgePosition,
    reloadMessages,
  } = useCompanyDashboard();

  const [active, setActive] = useState<TabId>(() => tabFromHash(window.location.hash));

  // Auto-refresh da aba Mensagens: reflete respostas dos devs sem reload
  // manual. Refaz o fetch ao entrar na aba, ao reganhar foco/visibilidade, e
  // a cada 25s enquanto a aba está aberta e visível. Ref mantém a função
  // fresca sem re-disparar o efeito a cada render.
  const reloadRef = useRef(reloadMessages);
  reloadRef.current = reloadMessages;
  useEffect(() => {
    if (active !== "messages") return;
    const refresh = () => { if (!document.hidden) reloadRef.current(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = window.setInterval(refresh, 25_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(id);
    };
  }, [active]);

  // Keep hash + state in sync so reload / browser back lands on the same tab.
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

  useEffect(() => {
    if (authRequired) navigate("/sessions/company/new", { replace: true });
  }, [authRequired, navigate]);

  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <Shell>
      <Hero subtitle={activeTab.subtitle} navCurrent={active === "messages" ? "messages" : "dashboard"} />

      {loading && !error && (
        <p style={{ color: "var(--muted)", fontSize: 13, padding: "32px 0" }}>
          Carregando dashboard…
        </p>
      )}
      {error && (
        <p style={{ color: "var(--warn)", fontSize: 13, padding: "32px 0" }}>{error}</p>
      )}

      {!loading && !error && (
        <>
          <TabStrip<TabId>
            tabs={TABS.map((t) => ({
              id:    t.id,
              label: t.label,
              badge: t.id === "messages"  ? messages.length
                   : t.id === "devs"      ? savedDevs.length
                   : t.id === "positions" ? positions.filter((p) => !p.archived).length
                   : null,
            })) as readonly TabDef<TabId>[]}
            active={active}
            onSelect={selectTab} />

          <div className="pt-8">
            {active === "overview"  && <StatsGrid stats={stats} />}
            {active === "activity"  && <RecentActivity events={recentActivity} />}
            {active === "messages"  && <MessagesList messages={messages} />}
            {active === "devs"      && (
              <SavedDevsList savedDevs={savedDevs}
                             onUpdateNote={updateNote} onRemove={removeSavedDev} />
            )}
            {active === "positions" && (
              <PositionsList positions={positions}
                             onCreate={createPosition}
                             onUpdate={updatePosition}
                             onArchive={archivePosition}
                             onReactivate={reactivatePosition}
                             onPurge={purgePosition} />
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

function tabFromHash(hash: string): TabId {
  const found = TABS.find((t) => t.hash === hash);
  // Fallback no primeiro tab visível (TABS[0]) — sobrevive a tabs ocultas.
  return found?.id ?? TABS[0].id;
}

// ── shell / hero ────────────────────────────────────────────────────────────

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "64px 32px 96px", color: "var(--text)" }}>
      {children}
    </div>
  );
}

function Hero({ subtitle, navCurrent }: { subtitle: string; navCurrent: "dashboard" | "messages" }) {
  return (
    <header className="mb-10">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        empresa · dashboard
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        Painel
        <span style={{ color: "var(--muted)", fontWeight: 400 }}> · o registro do que já aconteceu</span>
      </h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-3 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        <CompanyNav current={navCurrent} bare />
      </div>
      <div className="mt-2 font-mono"
           style={{ color: "var(--muted-soft)", fontSize: 12, letterSpacing: "0.04em" }}>
        {subtitle}
      </div>
    </header>
  );
}
