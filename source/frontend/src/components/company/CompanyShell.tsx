/**
 * CompanyShell — the company-side instantiation of the app shell
 * (design_handoff_empresa). Shared by /company/dashboard and /directory:
 *
 *   TopBar:  / empresa / {company} (+ extra crumb on directory)
 *   Sidebar: empresa  → Dashboard · Directory (badge: dev count)
 *            atividade → Mensagens · Devs salvos · Posições (quick-jumps:
 *                        navigate to /company/dashboard AND pick the tab)
 *            configuração → Equipe · Configurações (em breve, disabled)
 *   Foot:    plano · empresa / verificação habilitada / ● n devs
 *
 * Counts are optional — pages pass what they already fetched; missing
 * counts just hide the badge (no extra requests for chrome).
 */
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { Sidebar, SideFoot, SideItem, SideSection, GridIcon, EnvelopeIcon, GearIcon, DocIcon, PlusIcon } from "@/components/app/Sidebar";
import { TopBar } from "@/components/app/TopBar";
import { CompanyTopActions } from "@/components/company/CompanyTopActions";
import { useT } from "@/i18n/I18nProvider";
import { logoutCompany } from "@/lib/companyApi";

export type CompanyPage = "dashboard" | "directory" | "contact";
export type CompanyTab = "messages" | "devs" | "positions";

export const COMPANY_TAB_HASH: Record<CompanyTab, string> = {
  messages:  "#mensagens",
  devs:      "#devs",
  positions: "#posicoes",
};

// 14×14 line icons specific to the company sidebar.
const BookmarkIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M4 1.5h8v13l-4-3.2-4 3.2z" stroke="currentColor" />
  </svg>
);
const BriefcaseIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4.5" width="13" height="9" stroke="currentColor" />
    <path d="M5.5 4.5v-2h5v2M1.5 8h13" stroke="currentColor" />
  </svg>
);

export function CompanyShell({ page, activeTab, companyName, counts, crumbExtra, onJump, children }: {
  page: CompanyPage;
  /** Active dashboard sub-tab (drives the "atividade" active marker). */
  activeTab?: CompanyTab;
  companyName: string | null;
  counts?: Partial<Record<CompanyTab | "directory", number>>;
  /** Extra breadcrumb segment after the company name (e.g. "directory"). */
  crumbExtra?: string;
  /** Dashboard page passes a local tab-switcher; directory falls back to navigation. */
  onJump?: (tab: CompanyTab) => void;
  children: ReactNode;
}) {
  const t = useT();
  const navigate = useNavigate();
  const name = companyName ?? "—";

  function jump(tab: CompanyTab) {
    if (onJump) onJump(tab);
    else navigate(`/company/dashboard${COMPANY_TAB_HASH[tab]}`);
  }

  const sidebar = (
    <Sidebar>
      {page === "dashboard" ? (
        <SideItem icon={GridIcon} active onSelect={() => jump("messages")}>
          {t("company.shell.nav.dashboard")}
        </SideItem>
      ) : (
        <SideItem icon={GridIcon} to="/company/dashboard">
          {t("company.shell.nav.dashboard")}
        </SideItem>
      )}
      <SideItem icon={DocIcon} active={page === "directory"} to="/directory" badge={counts?.directory ?? null}>
        {t("company.shell.nav.directory")}
      </SideItem>

      <SideSection label={t("company.shell.sec.activity")} />
      <SideItem icon={EnvelopeIcon} badge={counts?.messages ?? null}
                active={page !== "directory" && activeTab === "messages"}
                onSelect={() => jump("messages")}>
        {t("company.dashboard.tabs.messages.label")}
      </SideItem>
      <SideItem icon={BookmarkIcon} badge={counts?.devs ?? null}
                active={page === "dashboard" && activeTab === "devs"}
                onSelect={() => jump("devs")}>
        {t("company.dashboard.tabs.devs.label")}
      </SideItem>
      <SideItem icon={BriefcaseIcon} badge={counts?.positions ?? null}
                active={page === "dashboard" && activeTab === "positions"}
                onSelect={() => jump("positions")}>
        {t("company.dashboard.tabs.positions.label")}
      </SideItem>

      <SideSection label={t("company.shell.sec.config")} />
      <ComingSoonItem icon={PlusIcon} label={t("company.shell.nav.team")} soonLabel={t("company.shell.soon")} />
      <ComingSoonItem icon={GearIcon} label={t("company.shell.nav.settings")} soonLabel={t("company.shell.soon")} />

      <SideFoot>
        <b>{t("company.shell.foot.plan")}</b><br />
        {t("company.shell.foot.verification")}<br />
        {counts?.directory != null ? (
          <><span style={{ color: "var(--signal-ink)" }}>●</span> {t("company.shell.foot.devs", { count: counts.directory })}</>
        ) : (
          <><span style={{ color: "var(--signal-ink)" }}>●</span> {t("company.shell.nav.directory").toLowerCase()}</>
        )}
        <br />
        {/* logout: DELETE da sessão por cookie + volta pro login (mesmo
            padrão do "sair" do dashboard do dev) */}
        <button type="button" className="signout"
                onClick={() => { void logoutCompany().then(() => navigate("/empresa/entrar", { replace: true })); }}>
          {t("dashboard.footer.sign_out")}
        </button>
      </SideFoot>
    </Sidebar>
  );

  const crumb = crumbExtra ? ["empresa", name, crumbExtra] : ["empresa", name];

  return (
    <AppShell topBar={<TopBar crumb={crumb} right={<CompanyTopActions companyName={companyName} />} />} sidebar={sidebar}>
      {children}
    </AppShell>
  );
}

function ComingSoonItem({ icon, label, soonLabel }: { icon: ReactNode; label: string; soonLabel: string }) {
  return (
    <button type="button" className="item soon" title={soonLabel} aria-disabled="true">
      <span className="ic" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
