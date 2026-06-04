/**
 * MachinesPill — the rounded "estou em N máquinas" pill in the hero.
 *
 * The pupil pulses via LensMark's `alive` prop, signalling "this
 * number is observed live".
 *
 * `count` is a mock value (or a future prop wired to a real
 * `/api/machines/count` endpoint). The mockup ships `0` as the
 * placeholder; we accept any number so it's easy to swap later.
 */
import { LensMark } from "@/components/LensMark";

export type MachinesPillProps = {
  /** Number of machines currently observed. MOCK: 0 until the API ships. */
  count?: number;
};

export function MachinesPill({ count = 0 }: MachinesPillProps) {
  return (
    <div className="machines reveal d3">
      <LensMark size={15} alive />{" "}
      estou em <b>{count}</b> máquinas
    </div>
  );
}
