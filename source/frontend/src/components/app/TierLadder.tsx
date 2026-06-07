/**
 * TierLadder — the 5 verification tiers as hairlined rows; the current
 * one is marked ● + "você está aqui" on a --surface-2 row. Token names
 * come from the verification system (lib/cli-shared/tier.ts) and are
 * NOT translated — only the why-lines are.
 */
import type { TrustTier } from "@/lib/cli-shared/tier";
import { useT } from "@/i18n/I18nProvider";

/** Ladder tiers in climb order (excludes the degenerate `unsigned`). */
export const LADDER_TIERS: readonly Exclude<TrustTier, "unsigned">[] = [
  "signature_only",
  "chain_intact",
  "identity_verified",
  "engine_verified",
  "fully_verifiable",
];

export function TierLadder({ current }: { current: TrustTier }) {
  const t = useT();
  return (
    <div className="ladder">
      {LADDER_TIERS.map((tier, i) => {
        const isCurrent = tier === current;
        return (
          <div key={tier} className={`ladder__r${isCurrent ? " is-current" : ""}`}>
            <span className="mark" aria-hidden="true">{isCurrent ? "●" : "○"}</span>
            <span>
              <span className="name">
                {tier}
                {isCurrent && <span className="you">{t("dashboard.ladder.you_are_here")}</span>}
              </span>
              <div className="why">{t(`dashboard.ladder.why.${tier}`)}</div>
            </span>
            <span className="step">tier {i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}
