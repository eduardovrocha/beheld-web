# compromisso · forever free for developers

Beheld is free for developers. It was free on day one, it's free today, and it will stay free for as long as this project exists — even if it changes hands, even if I leave, even if the company behind it grows. This document describes what that phrase means, what it excludes, and how you can check at any moment that it still holds.

---

## I · what costs zero

Beheld on your machine — the daemon, the CLI, the key that signs your bundles, the local history, the snapshot generation — has no price for the developer using it in their own name.

The public profile you generate with `beheld snapshot` — the verifiable URL, the personal dashboard on `beheld.dev`, the ability to revoke, update and archive your bundles — also has no price.

"Free" here means what it means in plain English: zero paid, no usage charges, no limit that effectively forces an upgrade, no developer-product feature hidden behind a paywall. It's not *freemium*. It's not *free trial*. It's free.

---

## II · what doesn't happen

There is no premium tier of Beheld for the developer. There won't be.

No monthly fee. No subscription. No charge per bundle generated, per session observed, per repository imported, per verification requested.

No advertising in the product. Not in the CLI, not in the dashboard, not on the public profile pages.

Your data is not sold. Not raw, not aggregated, not anonymized. Beheld does not monetize what it observes about you — not for a company, not for any third party, not even back to you.

Your presence in the Beheld directory, once the directory exists, is under your control, *opt-in*, and removal costs nothing and disables no part of the product.

---

## III · how Beheld pays for itself

Companies that want to search for developers in the Beheld directory, or use the product in an institutional capacity, pay for it. That's where Beheld makes money — not from you.

This separation is what makes the commitment sustainable. It's not charity. It's a business model where whoever extracts value from the developer's work pays, and the developer doesn't.

If at any point that model proves insufficient, the answer is to rethink what companies are charged. Never charge the dev.

---

## IV · if Beheld changes hands

This commitment is binding on any future owner of Beheld. Acquisition, merger, IP transfer, change of corporate name — in any scenario, this document survives as a condition.

If Beheld is sold to a buyer who refuses to honor it, the product is not sold. This clause will be formalized in the corporate documents when the company is constituted; before that, it lives as a public commitment registered in this repository, with witnesses on every commit.

If Beheld ceases to exist, three things happen by construction:

- the code remains under MIT on GitHub, executable and auditable by anyone;
- the bundles you already generated remain verifiable offline with your key — they were valid at the moment they were signed, and they remain valid;
- no developer data is sold, transferred or handed to third parties without the explicit consent of each developer involved.

---

## V · how you verify this holds

This document lives in `COMPROMISSO.md` in the Beheld repository. Every change is a commit. Every wording change shows up in the public `git diff`. You can, at any moment, check that it has not been watered down, removed or softened.

If at any moment this text is edited to remove one of the guarantees above, that gets registered in Git history as public proof of the broken promise. There is no way to rewrite history without it showing up.

Beheld's code is open source under MIT. If you distrust what the daemon does, read it. If you distrust what the server does, run your own — the product is *local-first* by construction, and the bundles are verifiable without depending on `beheld.dev`.

And one final clause, the one that gives this document teeth: **future versions can only add guarantees, never subtract**. If this commitment is edited, it will be to strengthen it — never to open an exception.

---

## signature

```
assinatura um · fundador
  ed25519  SHA256:<fingerprint-Ed25519-do-fundador>

assinatura dois · em nome do produto
  B3H31D
```

Identity is the key. Name, no.

Binding on any entity that takes over Beheld from here on.

`version 1.0` · `date: YYYY-MM-DD` · `canonical: github.com/<org>/beheld/blob/main/COMPROMISSO.md`

---

## annex · short forms

Reduced versions for places where the full document doesn't fit. All point to the canonical above.

### A.1 — install.sh banner

```
Beheld is free for devs. forever.
no premium · no ads · no selling your data.
versioned public commitment:
  github.com/<org>/beheld/blob/main/COMPROMISSO.md
```

### A.2 — landing card (paragraph)

> Beheld is free for developers. It was free on day one, it's free today, and stays free for as long as the project exists — even if it changes hands, even if I leave. No premium, no ads, no selling your data. **Versioned public commitment, with succession clause.** → read

### A.3 — README badge

```markdown
[![forever free for developers](https://img.shields.io/badge/forever_free-for_developers-c9a96e?style=flat-square)](./COMPROMISSO.md)
```

### A.4 — one line for bio / footer

> free for devs. forever. public commitment — `COMPROMISSO.md`.

### A.5 — standard answer to "what's the catch?"

> There's no catch for the dev. It's free forever, and it's written in a versioned document in the repository, with a succession clause. Beheld sustains itself by charging, further down the road, companies that want to search the developer directory. You're never the product.
