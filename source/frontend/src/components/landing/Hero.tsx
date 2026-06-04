/**
 * Hero — the top fold of the landing.
 *
 * Layout: 2-col grid (collapses to 1col under 900px).
 *   Left: eyebrow + h1 + lede + MachinesPill + InstallLine +
 *         install-meta + freebar + ToolsRow.
 *   Right: ObservedTerminal (marketing-mock animation).
 *
 * Copy is hardcoded in PT-BR per the v5 spec — the landing is a
 * single-locale page (other routes still use useT()).
 */
import { InstallLine } from "@/components/landing/InstallLine";
import { MachinesPill } from "@/components/landing/MachinesPill";
import { ObservedTerminal } from "@/components/landing/ObservedTerminal";
import { ToolsRow } from "@/components/landing/ToolsRow";

export function Hero() {
  return (
    <section className="hero">
      <div>
        <h1 className="title reveal d2">
          Beheld by signal.
          <br />
          <span className="em">Decided by you.</span>
        </h1>
        <p className="lede reveal d3">
          Um daemon local que observa suas sessões reais e seu git, e assina um
          bundle verificável. Trabalho real, não currículo cheio de
          palavras-chave.
        </p>

        <MachinesPill count={0} />

        <div className="reveal d4">
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            instale em uma linha
          </div>
          <InstallLine />
          <div className="install-meta">macOS e Linux</div>
          <div className="freebar">
            <span className="ff">forever free for developers</span>
            <span className="dot">·</span>
            <span>open source</span>
          </div>
          <ToolsRow />
        </div>
      </div>

      <ObservedTerminal />
    </section>
  );
}
