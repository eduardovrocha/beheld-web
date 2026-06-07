/**
 * VerificationStepper — os 3 passos da cadeia de prova da empresa
 * (design_handoff_cadastro_empresa §3): cadastro → email corporativo →
 * DNS TXT do domínio. Genérico de propósito: reaparece nas telas de
 * email-confirmation e DNS TXT (etapas 2 e 3) com `current` diferente.
 *
 * `current` é 1-based. Passos anteriores ao atual marcam ✓ (is-done);
 * o atual marca ● + aria-current="step"; os seguintes ficam ○ neutros.
 */
export interface StepDef {
  /** "passo 01" */
  label: string;
  /** "cadastro" */
  title: string;
  /** "você está aqui" / "1 click" / "~5 min" */
  when: string;
}

export function VerificationStepper({ steps, current, ariaLabel }: {
  steps: readonly StepDef[];
  current: number;
  ariaLabel: string;
}) {
  return (
    <nav className="stepper" aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const n = i + 1;
        const state = n < current ? "is-done" : n === current ? "is-now" : "";
        return (
          <div key={step.label} className={`step ${state}`.trim()}
               aria-current={n === current ? "step" : undefined}>
            <span className="ck" aria-hidden="true">
              {n < current ? "✓" : n === current ? "●" : "○"}
            </span>
            <span>
              <span className="lab">{step.label}</span>
              <span className="t">{step.title}</span>
            </span>
            <span className="when">{step.when}</span>
          </div>
        );
      })}
    </nav>
  );
}
