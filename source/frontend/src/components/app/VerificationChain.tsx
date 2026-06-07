/**
 * VerificationChain — the 5 verification layers as a hairlined list:
 * check square (✓ ok / ⚠ warn / ○ off) · title + token kicker +
 * description · evidence (the literal proof) · status text. Status is
 * conveyed by symbol AND text, never color-only.
 */
import type { ReactNode } from "react";

import type { TrustTier } from "@/lib/cli-shared/tier";

export type LayerState = "verified" | "pending" | "off";

export interface VerificationLayer {
  /** Verification-system token (mono kicker next to the title). */
  token: Exclude<TrustTier, "unsigned">;
  title: string;
  description: ReactNode;
  /** Literal proof string, e.g. `chave: c4f2…d8e1`. */
  evidence: string;
  state: LayerState;
}

const CK_GLYPH: Record<LayerState, string> = { verified: "✓", pending: "⚠", off: "○" };
const CK_CLS: Record<LayerState, string> = { verified: " ok", pending: " warn", off: "" };

export function VerificationChain({ layers }: { layers: VerificationLayer[] }) {
  return (
    <div className="vchain">
      {layers.map((l) => (
        <div key={l.token} className="vrow">
          <span className={`ck${CK_CLS[l.state]}`} aria-hidden="true">{CK_GLYPH[l.state]}</span>
          <div>
            <p className="t">{l.title} <span>{l.token}</span></p>
            <p className="d">{l.description}</p>
          </div>
          <span className="ev">{l.evidence}</span>
          <span className={`st${CK_CLS[l.state]}`}>{l.state}</span>
        </div>
      ))}
    </div>
  );
}
