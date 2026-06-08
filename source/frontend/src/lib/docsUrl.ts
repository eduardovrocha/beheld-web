/**
 * URL da view de documentação CLI versionada — agora vive no próprio
 * frontend em /docs/cli (rota client-side, mesmo origin). Tudo passa
 * por http://localhost:5173/ em dev e pelo domínio único em prod.
 *
 * Para o cenário hipotético do dashboard rodar em outro domínio, basta
 * setar `VITE_DOCS_CLI_URL` com a URL absoluta.
 */
const DEFAULT_DOCS_CLI_URL = "/docs/cli";

export function docsCliUrl(): string {
  const fromEnv = import.meta.env.VITE_DOCS_CLI_URL as string | undefined;
  return (fromEnv ?? DEFAULT_DOCS_CLI_URL).replace(/\/+$/, "");
}
