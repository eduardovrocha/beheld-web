/**
 * Contador de instalações cross-repo (B3H31D).
 *
 * Renderiza UMA linha em voz B3 com o número total de máquinas que rodaram
 * `beheld init` em algum momento. Conta monotônico crescente — não rastreamos
 * uninstall, então o número só sobe.
 *
 * Falha de rede / API down / cache miss → componente NÃO renderiza. Não há
 * placeholder, não há mensagem de erro. Better absent than wrong.
 *
 * Endpoint: GET /api/install/count → { count: N }
 * Cache server-side: 60s (Rails.cache).
 *
 * Disclosure completo está em /compromisso § "Contador de instalações".
 */
import { useEffect, useState } from "react";
import { useT, useFmt } from "@/i18n/I18nProvider";

const COUNT_URL = "/api/install/count";

interface CountResponse {
  count: number;
}

export function InstallCounter() {
  const t = useT();
  const { number } = useFmt();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(COUNT_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CountResponse | null) => {
        if (cancelled) return;
        // Tipo coercion defensiva — só aceita number finito não-negativo.
        if (data && typeof data.count === "number" && Number.isFinite(data.count) && data.count >= 0) {
          setCount(data.count);
        }
      })
      .catch(() => {
        /* falha silenciosa — componente não renderiza */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <p
      className="font-mono"
      style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.08em", margin: 0 }}
      aria-label={t("home.install.counter_aria") || undefined}
    >
      {t("home.install.counter", { count: number(count) })}
    </p>
  );
}
