/**
 * CompanyTopActions — topbar identity cluster for the company dashboard.
 * Thin composition over the shared @/components/app/TopActions: theme +
 * language + an account menu whose header shows the real company name.
 *
 * Perfil/Configurações/Equipe ficam "em breve" (sem rota ainda — alinhado ao
 * sidebar); ajuda é link externo; Sair faz logoutCompany → /empresa/entrar.
 * Injected via TopBar's `right` prop by CompanyShell.
 */
import { useNavigate } from "react-router-dom";

import { ActionsCluster, UserMenu, SoonItem, ExternalItem, DangerItem } from "@/components/app/TopActions";
import { useT } from "@/i18n/I18nProvider";
import { logoutCompany } from "@/lib/companyApi";

export function CompanyTopActions({ companyName }: { companyName: string | null }) {
  const t = useT();
  const navigate = useNavigate();
  const name = companyName ?? "—";
  const soon = t("company.shell.soon");

  function signOut(close: () => void) {
    close();
    // logout: DELETE da sessão por cookie + volta pro login (mesmo padrão do
    // "sair" do SideFoot).
    void logoutCompany().then(() => navigate("/empresa/entrar", { replace: true }));
  }

  return (
    <ActionsCluster>
      <UserMenu name={name} org={t("company.top.org")} menuAria={t("company.top.menu_aria")}>
        {(close) => (
          <>
            <SoonItem label={t("company.top.profile")} soon={soon} />
            <SoonItem label={t("company.shell.nav.settings")} soon={soon} />
            <SoonItem label={t("company.shell.nav.team")} soon={soon} />
            <div className="dd__sep" />
            <ExternalItem label={t("company.top.help")} href="https://beheld.dev/ajuda" onSelect={close} />
            <DangerItem label={t("company.top.signout")} onSelect={() => signOut(close)} />
          </>
        )}
      </UserMenu>
    </ActionsCluster>
  );
}
