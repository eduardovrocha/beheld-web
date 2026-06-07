/**
 * <T> — tradução com markup inline para a landing.
 *
 * O kit original (landing-v2-integration) usava o <Trans> do
 * react-i18next; aqui o copy vive no i18n próprio do app (chaves planas
 * `landingV2.*` em locales/<lng>.json) e este componente interpreta as
 * mesmas tags inline padronizadas do copy:
 *
 *   <sig>     → <span class="sig">      (verde signal)
 *   <strong>  → <b>                     (bold inline)
 *   <hl>      → <span class="h">        (highlight em terminais/tabelas)
 *   <dim>     → <span class="dim">      (cinza muted)
 *   <ok>      → <span class="pin-ok">   (verde de status)
 *   <warn>    → <span class="pin-warn"> (âmbar)
 *   <count>   → <b>
 *   <br/>     → <br/>
 *
 * Tags desconhecidas e entidades (&lt; &gt; &amp;) viram texto literal —
 * ex.: "[path:&lt;hash 8 chars&gt;]" rende como texto, não markup.
 *
 * `useT()` local devolve o t() global já prefixado com `landingV2.`,
 * para que as seções usem as mesmas chaves curtas do kit.
 */
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useT as useGlobalT } from "@/i18n/I18nProvider";

const PREFIX = "landingV2.";

type TagName = "sig" | "strong" | "hl" | "dim" | "ok" | "warn" | "count";

/** Classe CSS por tag; null = <b> sem classe. */
const TAG_CLASS: Record<TagName, string | null> = {
  sig: "sig",
  strong: null,
  hl: "h",
  dim: "dim",
  ok: "pin-ok",
  warn: "pin-warn",
  count: null,
};

const TAG_RE = /<(\/?)(sig|strong|hl|dim|ok|warn|count|br)\s*\/?>/g;

function decodeEntities(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/** Converte a string traduzida (com tags inline) em ReactNodes. */
export function parseInline(input: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Pilha de tags abertas; o copy real não aninha, mas o parser aguenta.
  const stack: Array<{ tag: TagName; children: ReactNode[] }> = [];
  let cursor = 0;
  let key = 0;

  const sink = () => (stack.length ? stack[stack.length - 1].children : out);

  for (const m of input.matchAll(TAG_RE)) {
    const [raw, closing, name] = m;
    const at = m.index ?? 0;
    if (at > cursor) sink().push(decodeEntities(input.slice(cursor, at)));
    cursor = at + raw.length;

    if (name === "br") {
      sink().push(<br key={key++} />);
    } else if (!closing) {
      stack.push({ tag: name as TagName, children: [] });
    } else {
      const open = stack.pop();
      if (!open) continue; // fechamento órfão — ignora
      const cls = TAG_CLASS[open.tag];
      sink().push(
        cls ? (
          <span key={key++} className={cls}>
            {open.children}
          </span>
        ) : (
          <b key={key++}>{open.children}</b>
        ),
      );
    }
  }
  if (cursor < input.length) sink().push(decodeEntities(input.slice(cursor)));

  // Tags sem fechamento: descarrega os filhos como texto plano.
  while (stack.length) {
    const open = stack.pop()!;
    (stack.length ? stack[stack.length - 1].children : out).push(...open.children);
  }
  return out;
}

/** t() já prefixado com `landingV2.` (mesmas chaves curtas do kit). */
export function useT() {
  const t = useGlobalT();
  return useCallback(
    (key: string, params?: Record<string, string | number>) => t(PREFIX + key, params),
    [t],
  );
}

export interface TProps {
  k: string;
  values?: Record<string, string | number>;
}

export function T({ k, values }: TProps) {
  const t = useT();
  return <>{parseInline(t(k, values))}</>;
}
