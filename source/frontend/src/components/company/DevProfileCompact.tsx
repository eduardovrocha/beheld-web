/**
 * DevProfileCompact — compact dev preview card (design_handoff_contato §3).
 * Keeps the company grounded in who they're contacting: handle + tier/status
 * pill + mono meta stats + eco chips, with a single "Ver perfil →" action.
 * Generic so it can be reused on thread pages / saved-dev expansions later.
 */
import { useT, useFmt } from "@/i18n/I18nProvider";

export interface DevProfileCompactData {
  handle:          string;
  bundle_slug?:    string | null;
  /** Verification label shown in the pill (tier token or bundle status). */
  badge?:          string | null;
  badgeTone?:      "ok" | "warn";
  test_ratio?:     number | null;   // percent 0–100
  last_bundle_at?: string | null;
  bundles?:        number | null;
  ecosystems?:     string[];
}

export function DevProfileCompact({ dev }: { dev: DevProfileCompactData }) {
  const t = useT();
  const fmt = useFmt();
  const handle = `@${dev.handle.replace(/^@/, "")}`;
  const profileUrl = dev.bundle_slug ? `/v/${dev.bundle_slug}` : null;

  return (
    <section className="profile-card" aria-label={t("contact.shell.profile_aria", { handle })}>
      <div className="profile-card__l">
        <div className="profile-card__handle">
          {profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer">{handle}</a> : handle}
          {dev.badge && (
            <span className={`tier${dev.badgeTone === "warn" ? " tier--warn" : ""}`}
                  aria-label={t("contact.shell.tier_aria", { tier: dev.badge })}>
              {dev.badge}
            </span>
          )}
        </div>

        {(dev.test_ratio != null || dev.last_bundle_at || dev.bundles != null) && (
          <div className="profile-card__meta">
            {dev.test_ratio != null && (
              <span>test ratio <b>{Math.round(dev.test_ratio)}%</b></span>
            )}
            {dev.last_bundle_at && (
              <>
                <span className="sep" aria-hidden="true">·</span>
                <span>{t("contact.shell.pub")} <b>{fmt.date(dev.last_bundle_at, { month: "short", year: "numeric" })}</b></span>
              </>
            )}
            {dev.bundles != null && (
              <>
                <span className="sep" aria-hidden="true">·</span>
                <span>bundles <b>{dev.bundles}</b></span>
              </>
            )}
          </div>
        )}

        {dev.ecosystems && dev.ecosystems.length > 0 && (
          <div className="profile-card__ecos">
            {dev.ecosystems.slice(0, 6).map((eco) => <span key={eco}>{eco}</span>)}
          </div>
        )}
      </div>

      {profileUrl && (
        <div className="profile-card__r">
          <a href={profileUrl} target="_blank" rel="noreferrer">{t("contact.shell.view_profile")}</a>
        </div>
      )}
    </section>
  );
}
