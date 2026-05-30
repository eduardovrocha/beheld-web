# compromisso · forever free for developers

O beheld é de graça pra desenvolvedor. Era no primeiro dia, é hoje, e seguirá sendo enquanto este projeto existir — mesmo se mudar de dono, mesmo se eu sair, mesmo se a empresa que vier por trás dele crescer. Este documento descreve o que essa frase significa, o que ela exclui, e como você pode conferir a qualquer momento que ela continua valendo.

---

## I · o que custa zero

O beheld no seu equipamento — o daemon, a CLI, a chave que assina os seus bundles, o histórico local, a geração do snapshot — não tem preço pro desenvolvedor que o usa em nome próprio.

O perfil público que você gera com `beheld snapshot` — a URL verificável, o dashboard pessoal em `beheld.dev`, a capacidade de revogar, atualizar e arquivar seus bundles — também não tem preço.

"De graça" aqui significa o que significa em português corrente: zero pago, sem cobrança por uso, sem limite que efetivamente force upgrade, sem feature do produto-pro-dev escondida atrás de paywall. Não é *freemium*. Não é *free trial*. É de graça.

---

## II · o que não acontece

Não existe tier premium do beheld pro desenvolvedor. Não vai existir.

Não tem mensalidade. Não tem assinatura. Não tem cobrança por bundle gerado, por sessão observada, por repositório importado, por verificação solicitada.

Não tem publicidade no produto. Nem na CLI, nem no dashboard, nem nas páginas de perfil público.

Os seus dados não são vendidos. Nem em bruto, nem agregados, nem anonimizados. O beheld não monetiza o que observa sobre você — nem pra empresa, nem pra terceiro nenhum, nem pra você mesmo de volta.

A sua presença no diretório do beheld, quando o diretório existir, é controle seu, em *opt-in*, e a retirada não custa nada e não desabilita parte alguma do produto.

---

## III · como o beheld se paga

Empresas que quiserem buscar desenvolvedores no diretório do beheld, ou usar o produto em capacidade institucional, pagam por isso. É lá que o beheld faz dinheiro — não em você.

Esta separação é o que torna o compromisso sustentável. Não é caridade. É um modelo de negócio em que quem extrai valor do trabalho do desenvolvedor paga, e o desenvolvedor não.

Se em algum momento esse modelo se mostrar insuficiente, a resposta é repensar o que se cobra das empresas. Nunca cobrar do dev.

---

## IV · se o beheld mudar de mãos

Este compromisso é vinculante pra qualquer dono futuro do beheld. Aquisição, fusão, transferência de IP, mudança de razão social — em qualquer cenário, este documento sobrevive como condição.

Se o beheld for vendido a um comprador que se recuse a honrá-lo, o produto não se vende. Esta cláusula será formalizada nos documentos societários quando a empresa for constituída; antes disso, ela vive como compromisso público registrado neste repositório, com testemunhas em cada commit.

Se o beheld deixar de existir, três coisas acontecem por construção:

- o código permanece sob MIT no GitHub, executável e auditável por qualquer um;
- os bundles que você já gerou continuam verificáveis offline com a sua chave — eram válidos no momento em que foram assinados, e seguem válidos;
- nenhum dado de desenvolvedor é vendido, transferido ou repassado a terceiros sem consentimento explícito de cada dev envolvido.

---

## V · como você verifica que isto vale

Este documento vive em `COMPROMISSO.md` no repositório do beheld. Toda mudança é um commit. Toda alteração de redação aparece no `git diff` público. Você pode, a qualquer momento, conferir que ele não foi diluído, retirado ou suavizado.

Se em algum momento este texto for editado pra remover uma das garantias acima, isso fica registrado no histórico do Git como prova pública da promessa quebrada. Não há como reescrever a história sem que ela apareça.

O código do beheld é open source sob MIT. Se você desconfiar do que o daemon faz, leia. Se você desconfiar do que o servidor faz, rode o seu próprio — o produto é *local-first* por construção, e os bundles são verificáveis sem dependência do `beheld.dev`.

E uma cláusula final, que é a que dá dente a este documento: **versões futuras só podem somar garantias, nunca subtrair**. Se este compromisso for editado, será pra fortalecê-lo — nunca pra abrir exceção.

---

## assinatura

```
assinatura um · fundador
  ed25519  SHA256:<fingerprint-Ed25519-do-fundador>

assinatura dois · em nome do produto
  B3H31D
```

Identidade é a chave. Nome, não.

Vinculante pra qualquer entidade que assuma o beheld a partir daqui.

`versão 1.0` · `data: YYYY-MM-DD` · `canônico: github.com/<org>/beheld/blob/main/COMPROMISSO.md`

---

## anexo · formas curtas

Versões reduzidas pra usar nos lugares onde o documento completo não cabe. Todas apontam pro canônico acima.

### A.1 — banner do install.sh

```
beheld é de graça pra dev. pra sempre.
sem premium · sem ads · sem venda dos seus dados.
compromisso público versionado:
  github.com/<org>/beheld/blob/main/COMPROMISSO.md
```

### A.2 — card pra landing (parágrafo)

> O beheld é de graça pra desenvolvedor. Era no primeiro dia, é hoje, e segue sendo enquanto o projeto existir — mesmo que mude de dono, mesmo que eu saia. Sem premium, sem ads, sem venda dos seus dados. **Compromisso público versionado, com cláusula de sucessão.** → ler

### A.3 — selo pro README

```markdown
[![forever free for developers](https://img.shields.io/badge/forever_free-for_developers-c9a96e?style=flat-square)](./COMPROMISSO.md)
```

### A.4 — uma linha pra bio / footer

> de graça pra dev. pra sempre. compromisso público — `COMPROMISSO.md`.

### A.5 — resposta padrão a "qual a pegadinha?"

> Não tem pegadinha pro dev. É de graça pra sempre, e está escrito num documento versionado no repositório, com cláusula de sucessão. O beheld se sustenta cobrando, mais pra frente, de empresas que querem buscar devs no diretório. Você nunca é o produto.
