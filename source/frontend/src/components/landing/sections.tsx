/**
 * Landing v5 — content sections (Manifesto → CTA → Footer).
 *
 * Grouped here for compactness; each section is an exported component
 * so it can be unit-tested in isolation (Fase 6). Copy is PT-BR
 * literal from the approved mockup. Anchor ids match the topbar nav.
 *
 * The components do NOT include the surrounding `.wrap` — the Home
 * route owns one `<main class="landing-v5 wrap">` that wraps them all.
 */
import { useRef, type ReactNode } from "react";

import { InstallLine } from "@/components/landing/InstallLine";
import { LensMark } from "@/components/LensMark";
import { Section } from "@/components/landing/Section";
import { useRevealMany } from "@/hooks/useReveal";

// ─────────────────────────────────────────────────────────────────────────
//  Manifesto · "Além do currículo"
// ─────────────────────────────────────────────────────────────────────────

export function Manifesto() {
  return (
    <Section title="Além do currículo">
      <p className="manifesto reveal d1">
        Nenhuma plataforma viu você trabalhando de madrugada ou no fim de
        semana. O recrutador não percebe o valor daquele teste escrito pra
        garantir que o gateway de pagamento funciona em dev e produção de
        forma isolada. Aquele gerente que te rejeitou não faz ideia de que
        seu <b>test ratio é quatro vezes maior que a mediana global</b>. O
        B3H31D sabe de tudo isso — e pode mostrar, caso você solicite.
        <span className="punch">
          Isso é trabalho real, não currículo inventado cheio de
          palavras-chave.
        </span>
      </p>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  01 · O que o daemon captura
// ─────────────────────────────────────────────────────────────────────────

type CaptureCard = { k: string; big: string; p: string };

const CAPTURE_CARDS: CaptureCard[] = [
  { k: "daemon", big: "local", p: "Sem cloud. Nada sai sem você assinar." },
  { k: "sinais", big: "L1 + L2", p: "Histórico de commits + sessões de Harness e IDEs." },
  { k: "bundle", big: "Ed25519", p: "Assinado offline · verificável sem o Beheld." },
  { k: "custo pro dev", big: "$0", p: "Para sempre." },
];

export function CaptureCards() {
  return (
    <Section
      id="captura"
      num="01"
      title="O que o daemon captura"
      aside="sem setup extra"
    >
      <div className="cap">
        {CAPTURE_CARDS.map((c, i) => (
          <div key={c.k} className={`capcard reveal d${(i % 4) + 1}`}>
            <div className="k">{c.k}</div>
            <div className="big">{c.big}</div>
            <p>{c.p}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  O que o Beheld não faz
// ─────────────────────────────────────────────────────────────────────────

type NotItem = { title: string; body: string };

const NOT_ITEMS: NotItem[] = [
  {
    title: "Não envia nada pra nuvem.",
    body: "O daemon é local. O que sai, sai porque você assinou e mandou.",
  },
  {
    title: "Não lê seu código.",
    body: "Captura sinais, ecossistemas, disciplina de teste, padrão no tempo. Conteúdo de arquivo, mensagem de commit e nome de branch: nunca gravados.",
  },
  {
    title: "Não te dá nota.",
    body: "Não existe \"score de talento\". Ele relata o observável. Você lê.",
  },
  {
    title: "Não conta pra ninguém.",
    body: "Nenhum recrutador, gerente ou empresa vê nada até você gerar um bundle e publicar.",
  },
  {
    title: "Não cobra de você.",
    body: "Nunca. Sem tier premium escondido pra desbloquear depois.",
  },
  {
    title: "Não te prende.",
    body: "Open source, bundle verificável offline. Funciona mesmo se o Beheld sumir amanhã.",
  },
];

export function NotDoingList() {
  return (
    <Section
      id="nao"
      num="✗"
      title="O que o Beheld não faz"
      aside="honesto sobre os limites"
    >
      <div className="nots">
        {NOT_ITEMS.map((n, i) => (
          <div key={n.title} className={`notrow reveal d${Math.floor(i / 2) + 1}`}>
            <span className="x">✗</span>
            <div>
              <b>{n.title}</b>
              <p>{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  02 · Claimed vs Demonstrated
// ─────────────────────────────────────────────────────────────────────────

export function ClaimedVsDemonstrated() {
  return (
    <Section
      num="02"
      title="Claimed vs Demonstrated · o delta verificável"
      aside="3 estados possíveis"
    >
      <p className="cvd-intro reveal d1">
        O dev declara o que é. O daemon mostra o que de fato aparece nas
        sessões e no git. Onde os dois se encontram, o sinal é confirmado.
        Onde divergem, o sinal é limitado — e isso também é informação.
      </p>

      <div className="delta">
        <div className="drow ok reveal d1">
          <span className="mk">✓</span>
          <div>
            <div className="claim">Stack principal: Python, TypeScript</div>
            <div className="proof">
              <span className="st">Confirmado.</span> 87% das sessões em
              Python/TS nos últimos 90 dias. 8 repositórios em L1.
            </div>
          </div>
        </div>
        <div className="drow ok reveal d2">
          <span className="mk">✓</span>
          <div>
            <div className="claim">Senioridade: 8+ anos backend engineer</div>
            <div className="proof">
              <span className="st">Confirmado.</span> L1 mostra atividade
              contínua desde 2017. Test ratio médio: 38%, 4.2× mediana global.
            </div>
          </div>
        </div>
        <div className="drow warn reveal d3">
          <span className="mk">⚠</span>
          <div>
            <div className="claim">Especialização: Senior React Engineer</div>
            <div className="proof">
              <span className="st">Sinal limitado.</span> React em 2 de 87
              sessões. Nenhum repositório React em L1. Trajetória recente:
              Python/FastAPI.
            </div>
          </div>
        </div>
      </div>

      <div className="drow self reveal d2">
        <span className="mk">○</span>
        <div>
          <div className="claim">self-declared · não verificado pelo Beheld</div>
          <div className="proof">
            <div className="sdgrid">
              <div className="sdg">
                <div className="l">emprego autodeclarado</div>
                <div className="v">
                  Stripe <span>2020–2022</span>
                  Stack Overflow <span>2018–2020</span>
                </div>
              </div>
              <div className="sdg">
                <div className="l">formação autodeclarada</div>
                <div className="v">
                  Mestrado em Computação <span>USP, 2017</span>
                </div>
              </div>
            </div>
            <div className="sdnote">
              O Beheld não verifica histórico de empregadores nem formação.
              Apresenta como o dev declarou, sem confirmação externa.
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  03 · Como funciona — três passos
// ─────────────────────────────────────────────────────────────────────────

export function HowItWorksSteps() {
  return (
    <Section
      id="como"
      num="03"
      title="Como funciona · três passos"
      aside="setup único"
    >
      <div className="steps">
        <div className="step reveal d1">
          <div className="sk">L1 · Git histórico</div>
          <h3>Instalação única</h3>
          <div className="cmd">
            <span className="pr">$</span> beheld init
          </div>
          <div className="sub">
            <div className="si">
              <b>Daemon</b> — background · SQLite local
            </div>
            <div className="si">
              <b>Chave Ed25519</b> — gerada offline · sua
            </div>
            <div className="si">
              <b>L1 importado</b> — git log automático
            </div>
          </div>
        </div>

        <div className="step reveal d2">
          <div className="sk">L2 · Trajetória</div>
          <h3>Contínuo</h3>
          <div className="sub" style={{ marginTop: 0 }}>
            <div className="si">
              <b>Observação</b> — cada sessão Claude Code
            </div>
            <div className="si">
              <b>Conteúdo</b> — nunca registrado
            </div>
          </div>
        </div>

        <div className="step reveal d3">
          <div className="sk">Gerar bundle</div>
          <h3>Quando quiser</h3>
          <div className="cmd">
            <span className="pr">$</span> beheld snapshot
          </div>
          <div className="sub">
            <div className="si">
              <b>Resultado</b> — URL pública verificável
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  04 · Cadeia de verificação — cinco camadas (cascade ✓)
// ─────────────────────────────────────────────────────────────────────────

type ChainLayer = { title: string; body: string; tier: string };

const CHAIN_LAYERS: ChainLayer[] = [
  {
    title: "Assinatura Ed25519",
    body: "Chave do dev assina o bundle. Verificável offline, sem depender do Beheld.",
    tier: "signature_only",
  },
  {
    title: "Chain hash",
    body: "Cada bundle referencia o anterior. Reescrever um quebra toda a cadeia.",
    tier: "chain_intact",
  },
  {
    title: "Identidade GitHub",
    body: "OAuth vincula a chave pública do dev a um usuário GitHub verificado.",
    tier: "identity_verified",
  },
  {
    title: "Engine version",
    body: "Hash do binário conferido contra build reproducível publicado.",
    tier: "engine_verified",
  },
  {
    title: "Sigstore Rekor",
    body: "Hash registrado em log público append-only. Impede backdating.",
    tier: "fully_verifiable",
  },
];

export function VerificationChain() {
  // useRevealMany observes every .reveal inside its ref. The cascade ✓
  // (which lights up the .ck per row) is driven by the same `.in` class
  // applied on the .clayer wrappers we mark below. Stagger via CSS
  // transition-delay through .d1–.d5 classes.
  const containerRef = useRef<HTMLDivElement>(null);
  useRevealMany<HTMLDivElement>(".clayer", { threshold: 0.3 });

  return (
    <Section num="04" title="Cadeia de verificação · cinco camadas">
      <div className="chain-tier reveal d1">Tier · fully_verifiable</div>
      <div className="chain" ref={containerRef}>
        {CHAIN_LAYERS.map((l, i) => (
          <div
            key={l.tier}
            className="clayer"
            style={{ transitionDelay: `${i * 0.26}s` }}
          >
            <span className="ck">✓</span>
            <div className="cc">
              <b>{l.title}</b>
              <p>{l.body}</p>
            </div>
            <span className="tier">{l.tier}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  FAQ — accordion, one open at a time
// ─────────────────────────────────────────────────────────────────────────

type FAQItem = { q: string; a: string };

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "\"Isso é mais um spyware de produtividade?\"",
    a: "É o contrário exato. Aquelas ferramentas medem você pra sua empresa, dentro dela, sem você controlar. O Beheld mede você pra você. O dado é seu, a chave é sua, nada é publicado sem sua assinatura. É a relação de poder invertida — e por isso confundir os dois é o pior erro possível.",
  },
  {
    q: "\"O que exatamente ele captura?\"",
    a: "Sinais agregados: quais ecossistemas você toca, seu test ratio, como seu padrão muda ao longo dos meses, seu histórico de git. Não captura o conteúdo do seu código nem o que você digita numa IDE ou Harness.",
  },
  {
    q: "\"Quem vê meu perfil?\"",
    a: "Ninguém, por padrão. Ele vive na sua máquina. Quando você roda beheld snapshot, gera um bundle assinado, e só aí decide se publica a URL. Revogável quando quiser.",
  },
  {
    q: "\"Se é de graça, qual é a pegadinha?\"",
    a: "Não tem pegadinha pro dev. É de graça pra sempre, e isso é um compromisso público que sobrevive a quem fundou. O Beheld se sustenta cobrando, mais pra frente, de empresas que querem buscar devs no diretório.",
  },
  {
    q: "\"Vai pesar na minha máquina?\"",
    a: "Roda em background, grava num SQLite local, processa em lote. Você não vai sentir.",
  },
  {
    q: "\"Não confio em rodar um binário qualquer.\"",
    a: "Justo. É open source sob MIT, o build é reproducível e o hash do binário é conferível contra o que está publicado. Leia o código antes de rodar — é pra isso que ele é aberto.",
  },
  {
    q: "\"Pra que serve se nenhuma empresa usa ainda?\"",
    a: "Porque o bundle já é útil sozinho: uma URL verificável que você cola num processo seletivo, num README, ou manda direto pra quem te entrevista. E ele cresce enquanto você trabalha, sem você manter nada à mão.",
  },
];

export function FAQ() {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const opened = e.currentTarget;
    if (!opened.open) return;
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLDetailsElement>("details.qa").forEach((d) => {
      if (d !== opened) d.open = false;
    });
  }

  return (
    <Section num="?" title="As perguntas certas" aside="objeções respondidas">
      <div className="faq" ref={containerRef}>
        {FAQ_ITEMS.map((item, i) => (
          <details
            key={item.q}
            className={`qa reveal d${Math.min(4, Math.floor(i / 2) + 1)}`}
            onToggle={handleToggle}
          >
            <summary className="q">
              <span className="pl">+</span> {item.q}
            </summary>
            <div className="a">{item.a}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Cenas reais
// ─────────────────────────────────────────────────────────────────────────

type Scene = { h: string; p: ReactNode };

const SCENES: Scene[] = [
  {
    h: "Você foi rejeitado e nunca soube por quê.",
    p: <><span className="arrow">→</span> Seu trabalho real nunca esteve na mesa. Agora pode estar.</>,
  },
  {
    h: "Você mudou de carreira e o LinkedIn não conta a história.",
    p: <><span className="arrow">→</span> O git e as sessões contam, sem você reescrever nada.</>,
  },
  {
    h: "Você é freelancer e todo cliente pede \"prova\".",
    p: <><span className="arrow">→</span> Mande uma URL assinada, não um PDF que qualquer um edita.</>,
  },
  {
    h: "Você aplica pra fora do seu país.",
    p: <><span className="arrow">→</span> Sotaque não aparece num bundle. Trabalho aparece.</>,
  },
  {
    h: "Você já fez o trabalho.",
    p: <><span className="arrow">→</span> O Beheld só garante que ele seja visto como é.</>,
  },
];

export function RealScenes() {
  return (
    <Section title="Se isso já aconteceu com você" aside="cenas reais">
      <div className="cenas">
        {SCENES.map((s, i) => (
          <div key={s.h} className={`cena reveal d${Math.min(3, Math.floor(i / 2) + 1)}`}>
            <div className="ch">{s.h}</div>
            <div className="cp">{s.p}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  CTA
// ─────────────────────────────────────────────────────────────────────────

export function CTASection() {
  return (
    <section className="cta" id="cta">
      <InstallLine className="reveal d1" />
      <div className="free reveal d2">forever free for developers</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Footer
// ─────────────────────────────────────────────────────────────────────────

export function LandingFooter() {
  return (
    <footer className="footer wrap">
      <div className="fmark">
        <LensMark size={16} />
        <span>beheld.dev — Beheld by signal. Decided by you.</span>
      </div>
      <div className="flinks">
        <a className="mail" href="mailto:hi@beheld.dev">hi@beheld.dev</a>
        <a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="#">Docs</a>
        <a href="#">Manifesto</a>
      </div>
    </footer>
  );
}
