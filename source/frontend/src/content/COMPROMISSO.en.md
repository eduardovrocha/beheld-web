# compromisso · forever free for developers

Beheld is free for developers. It was free on day one, it's free today, and it will stay free for as long as this project exists, even if it changes hands, even if I leave, even if the company behind it grows. This document describes what that phrase means, what it excludes, and how you can check at any moment that it still holds.

---

## I · what costs zero

Beheld on your machine, the daemon, the CLI, the key that signs your bundles, the local history, the snapshot generation, has no price for the developer using it in their own name.

The public profile you generate with `beheld snapshot`, the verifiable URL, the personal dashboard on `beheld.dev`, the ability to revoke, update and archive your bundles, also has no price.

"Free" here means what it means in plain English: zero paid, no usage charges, no limit that effectively forces an upgrade, no developer-product feature hidden behind a paywall. It's not *freemium*. It's not *free trial*. It's free.

---

## II · what doesn't happen

There is no premium tier of Beheld for the developer. There won't be.

No monthly fee. No subscription. No charge per bundle generated, per session observed, per repository imported, per verification requested.

No advertising in the product. Not in the CLI, not in the dashboard, not on the public profile pages.

Your data is not sold. Not raw, not aggregated, not anonymized. Beheld does not monetize what it observes about you, not for a company, not for any third party, not even back to you.

Your presence in the Beheld directory, once the directory exists, is under your control, *opt-in*, and removal costs nothing and disables no part of the product.

---

## III · how Beheld pays for itself

Companies that want to search for developers in the Beheld directory, or use the product in an institutional capacity, pay for it. That's where Beheld makes money, not from you.

This separation is what makes the commitment sustainable. It's not charity. It's a business model where whoever extracts value from the developer's work pays, and the developer doesn't.

If at any point that model proves insufficient, the answer is to rethink what companies are charged. Never charge the dev.

---

## IV · if Beheld changes hands

This commitment is binding on any future owner of Beheld. Acquisition, merger, IP transfer, change of corporate name, in any scenario, this document survives as a condition.

If Beheld is sold to a buyer who refuses to honor it, the product is not sold. This clause will be formalized in the corporate documents when the company is constituted; before that, it lives as a public commitment registered in this repository, with witnesses on every commit.

If Beheld ceases to exist, three things happen by construction:

- the code remains under MIT on GitHub, executable and auditable by anyone;
- the bundles you already generated remain verifiable offline with your key, they were valid at the moment they were signed, and they remain valid;
- no developer data is sold, transferred or handed to third parties without the explicit consent of each developer involved.

---

## V · how you verify this holds

This document lives in `COMPROMISSO.md` in the Beheld repository. Every change is a commit. Every wording change shows up in the public `git diff`. You can, at any moment, check that it has not been watered down, removed or softened.

If at any moment this text is edited to remove one of the guarantees above, that gets registered in Git history as public proof of the broken promise. There is no way to rewrite history without it showing up.

Beheld's code is open source under MIT. If you distrust what the daemon does, read it. If you distrust what the server does, run your own, the product is *local-first* by construction, and the bundles are verifiable without depending on `beheld.dev`.

And one final clause, the one that gives this document teeth: **future versions can only add guarantees, never subtract**. If this commitment is edited, it will be to strengthen it, never to open an exception.

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

## Install counter

The counter on the home page shows how many machines have registered B3H31D at some point.

How it works:

- On the first run of `beheld init`, we generate a random UUID v4 on your machine and write it to `~/.beheld/install-id` with permissions `0o600`.
- That UUID is sent once, together with the OS name (`macos` or `linux`) and the beheld version, to `https://beheld.dev/api/install/register`.
- Nothing else is sent. No IP. No hostname. No personal identifier.
- Updates and reinstalls **do not** repeat the send, the UUID already exists on disk and the file's presence is the source of truth.

The exact payload:

```json
{ "id": "<uuid-v4>", "os": "macos", "version": "0.x.y" }
```

### How to disable

Set `BEHELD_NO_TELEMETRY=1` in your shell before running `beheld init`. Nothing will be sent, nothing will be written to disk, and no counter-related line will appear in the output. Opt-out is invisible by design.

### What the counter measures

*Observed installs*, not active users. The counter only goes up; it never goes down. We don't track uninstall, doing so would require recurring telemetry, which we are not willing to collect.

If you delete `~/.beheld/` entirely and run `beheld init` again, it counts as a new install. This is unavoidable and acceptable; it happens rarely.

### What's guaranteed in code

- The `installs` table schema has **only** 4 fields: `id`, `os`, `version`, `timestamps`. Test `spec/requests/installs_spec.rb` fails if any field is added without updating this document.
- The `InstallsController` does not touch `request.ip`, `request.user_agent`, `request.headers`, or `request.env`. The test reads the source and fails if any of those references are added.
- The CLI client (`packages/cli/src/install/counter.ts`) only reads `BEHELD_DATA_DIR` and `BEHELD_NO_TELEMETRY` from the environment. A regex test fails if any other env variable is touched.

Any expansion of this list requires a bump of this document, a bump of the server and client privacy tests, and a bump of the disclosure visible in `beheld init`. The list is an entrenched clause.
