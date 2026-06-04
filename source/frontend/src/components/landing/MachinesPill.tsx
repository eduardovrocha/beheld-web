/**
 * MachinesPill — the rounded "estou em N máquinas" pill in the hero.
 *
 * Uses `tp()` (plural-aware) so singular vs plural is locale-correct:
 *   pt: "estou em 1 máquina" / "estou em 5 máquinas"
 *   en: "I'm on 1 machine"   / "I'm on 5 machines"
 *   es: "estoy en 1 máquina" / "estoy en 5 máquinas"
 *
 * `count` is a mock value (or a future prop wired to a real
 * `/api/machines/count` endpoint).
 */
import { LensMark } from "@/components/LensMark";
import { useI18n } from "@/i18n/I18nProvider";

export type MachinesPillProps = {
  /** Number of machines currently observed. MOCK: 0 until the API ships. */
  count?: number;
};

export function MachinesPill({ count = 0 }: MachinesPillProps) {
  const { tp } = useI18n();
  // The plural template embeds the count itself ("{count}") — we
  // split the result around the number so we can keep it inside a <b>
  // for the accent colour, matching the mockup.
  const text = tp("landing.machines.text", count);
  const [before, after] = text.split(String(count));
  return (
    <div className="machines reveal d3">
      <LensMark size={15} alive />{" "}
      {before}
      <b>{count}</b>
      {after}
    </div>
  );
}
