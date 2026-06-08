/**
 * DevTopActions — topbar identity cluster for the dev dashboard. Thin
 * composition over the shared @/components/app/TopActions: theme + language +
 * an account menu whose header shows the dev handle + real verification tier.
 *
 * Perfil/Bundles/Configurações do B3H31D/Chave de assinatura ficam "em breve"
 * (são abas/seções dentro de /dashboard, não rotas próprias); Documentação e
 * Central de ajuda são links externos; Sair reaproveita o signOut da página
 * (clearSessionToken → "/"). Injected via TopBar's `right` prop by Dashboard.
 */
import { ActionsCluster, UserMenu, SoonItem, ExternalItem, DangerItem } from "@/components/app/TopActions";
import { useT } from "@/i18n/I18nProvider";
import type { TrustTier } from "@/lib/cli-shared/tier";
import { docsCliUrl } from "@/lib/docsUrl";

export function DevTopActions({ handle, tier, onSignOut }: {
  handle: string;
  tier: TrustTier;
  onSignOut: () => void;
}) {
  const t = useT();
  const soon = t("company.shell.soon"); // "em breve" — string genérica compartilhada

  return (
    <ActionsCluster>
      <UserMenu name={handle} org={t("dev.top.org", { tier })} menuAria={t("dev.top.menu_aria")}>
        {(close) => (
          <>
            <SoonItem label={t("dev.top.profile")} soon={soon} />
            <SoonItem label={t("dev.top.bundles")} soon={soon} />
            <SoonItem label={t("dev.top.daemon")} soon={soon} />
            <SoonItem label={t("dev.top.key")} soon={soon} />
            <div className="dd__sep" />
            <ExternalItem label={t("dev.top.docs")} href={docsCliUrl()} onSelect={close} />
            <ExternalItem label={t("dev.top.help")} href="https://beheld.dev/ajuda" onSelect={close} />
            <DangerItem label={t("dev.top.signout")} onSelect={() => { close(); onSignOut(); }} />
          </>
        )}
      </UserMenu>
    </ActionsCluster>
  );
}
