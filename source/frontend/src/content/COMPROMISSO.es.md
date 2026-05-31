# compromisso · forever free for developers

Beheld es gratis para desarrolladores. Lo era el primer día, lo es hoy, y seguirá siéndolo mientras este proyecto exista — incluso si cambia de dueño, incluso si yo me voy, incluso si la empresa que venga detrás crece. Este documento describe lo que esa frase significa, lo que excluye, y cómo puedes comprobar en cualquier momento que sigue valiendo.

---

## I · lo que cuesta cero

Beheld en tu equipo — el daemon, la CLI, la clave que firma tus bundles, el historial local, la generación del snapshot — no tiene precio para el desarrollador que lo usa en nombre propio.

El perfil público que generas con `beheld snapshot` — la URL verificable, el dashboard personal en `beheld.dev`, la capacidad de revocar, actualizar y archivar tus bundles — tampoco tiene precio.

"Gratis" aquí significa lo que significa en castellano corriente: cero pagado, sin cobro por uso, sin límite que efectivamente fuerce upgrade, sin feature del producto-para-dev escondida tras paywall. No es *freemium*. No es *free trial*. Es gratis.

---

## II · lo que no sucede

No existe tier premium de Beheld para el desarrollador. No va a existir.

No hay mensualidad. No hay suscripción. No hay cobro por bundle generado, por sesión observada, por repositorio importado, por verificación solicitada.

No hay publicidad en el producto. Ni en la CLI, ni en el dashboard, ni en las páginas de perfil público.

Tus datos no se venden. Ni en bruto, ni agregados, ni anonimizados. Beheld no monetiza lo que observa sobre ti — ni para empresa, ni para ningún tercero, ni para ti mismo de vuelta.

Tu presencia en el directorio de Beheld, cuando el directorio exista, está bajo tu control, en *opt-in*, y la retirada no cuesta nada y no deshabilita parte alguna del producto.

---

## III · cómo Beheld se paga

Las empresas que quieran buscar desarrolladores en el directorio de Beheld, o usar el producto en capacidad institucional, pagan por ello. Ahí es donde Beheld hace dinero — no en ti.

Esta separación es lo que hace el compromiso sostenible. No es caridad. Es un modelo de negocio en el que quien extrae valor del trabajo del desarrollador paga, y el desarrollador no.

Si en algún momento ese modelo se muestra insuficiente, la respuesta es repensar lo que se cobra a las empresas. Nunca cobrar al dev.

---

## IV · si Beheld cambia de manos

Este compromiso es vinculante para cualquier dueño futuro de Beheld. Adquisición, fusión, transferencia de IP, cambio de razón social — en cualquier escenario, este documento sobrevive como condición.

Si Beheld es vendido a un comprador que se niegue a honrarlo, el producto no se vende. Esta cláusula se formalizará en los documentos societarios cuando la empresa se constituya; antes de eso, vive como compromiso público registrado en este repositorio, con testigos en cada commit.

Si Beheld deja de existir, tres cosas suceden por construcción:

- el código permanece bajo MIT en GitHub, ejecutable y auditable por cualquiera;
- los bundles que ya generaste siguen siendo verificables offline con tu clave — eran válidos en el momento en que fueron firmados, y siguen siendo válidos;
- ningún dato de desarrollador es vendido, transferido o pasado a terceros sin consentimiento explícito de cada dev involucrado.

---

## V · cómo verificas que esto vale

Este documento vive en `COMPROMISSO.md` en el repositorio de Beheld. Todo cambio es un commit. Toda alteración de redacción aparece en el `git diff` público. Puedes, en cualquier momento, comprobar que no ha sido diluido, retirado o suavizado.

Si en algún momento este texto es editado para remover una de las garantías de arriba, eso queda registrado en el historial de Git como prueba pública de la promesa rota. No hay manera de reescribir la historia sin que aparezca.

El código de Beheld es open source bajo MIT. Si desconfías de lo que el daemon hace, léelo. Si desconfías de lo que el servidor hace, corre el tuyo — el producto es *local-first* por construcción, y los bundles son verificables sin depender de `beheld.dev`.

Y una cláusula final, la que da diente a este documento: **versiones futuras solo pueden sumar garantías, nunca restar**. Si este compromiso es editado, será para fortalecerlo — nunca para abrir una excepción.

---

## firma

```
assinatura um · fundador
  ed25519  SHA256:<fingerprint-Ed25519-do-fundador>

assinatura dois · em nome do produto
  B3H31D
```

La identidad es la clave. El nombre, no.

Vinculante para cualquier entidad que asuma Beheld a partir de aquí.

`versión 1.0` · `fecha: YYYY-MM-DD` · `canónico: github.com/<org>/beheld/blob/main/COMPROMISSO.md`

---

## anexo · formas cortas

Versiones reducidas para usar en los lugares donde el documento completo no cabe. Todas apuntan al canónico de arriba.

### A.1 — banner del install.sh

```
Beheld es gratis para devs. para siempre.
sin premium · sin ads · sin venta de tus datos.
compromiso público versionado:
  github.com/<org>/beheld/blob/main/COMPROMISSO.md
```

### A.2 — card para landing (párrafo)

> Beheld es gratis para desarrolladores. Lo era el primer día, lo es hoy, y sigue siéndolo mientras el proyecto exista — incluso si cambia de dueño, incluso si yo me voy. Sin premium, sin ads, sin venta de tus datos. **Compromiso público versionado, con cláusula de sucesión.** → leer

### A.3 — sello para README

```markdown
[![forever free for developers](https://img.shields.io/badge/forever_free-for_developers-c9a96e?style=flat-square)](./COMPROMISSO.md)
```

### A.4 — una línea para bio / footer

> gratis para devs. para siempre. compromiso público — `COMPROMISSO.md`.

### A.5 — respuesta estándar a "¿cuál es la trampa?"

> No hay trampa para el dev. Es gratis para siempre, y está escrito en un documento versionado en el repositorio, con cláusula de sucesión. Beheld se sostiene cobrando, más adelante, a las empresas que quieren buscar devs en el directorio. Tú nunca eres el producto.

---

## Contador de instalaciones

El contador en la página inicial muestra cuántas máquinas registraron B3H31D en algún momento.

Funciona así:

- En la primera ejecución de `beheld init`, generamos un UUID v4 aleatorio en tu máquina, guardado en `~/.beheld/install-id` con permisos `0o600`.
- Ese UUID se envía una sola vez, junto con el sistema operativo (`macos` o `linux`) y la versión de beheld, a `https://beheld.dev/api/install/register`.
- Nada más se envía. Sin IP. Sin hostname. Sin ningún identificador personal.
- Actualizaciones y reinstalaciones **no** repiten el envío — el UUID ya existe en disco y la presencia del archivo es la fuente de verdad.

El payload exacto:

```json
{ "id": "<uuid-v4>", "os": "macos", "version": "0.x.y" }
```

### Cómo desactivarlo

Define `BEHELD_NO_TELEMETRY=1` en tu shell antes de ejecutar `beheld init`. Nada se enviará, nada se escribirá en disco, y ninguna línea sobre el contador aparecerá en la salida. El opt-out es invisible por diseño.

### Qué mide el contador

*Instalaciones observadas*, no usuarios activos. El contador solo sube; nunca baja. No rastreamos uninstall — hacerlo exigiría telemetría recurrente, que no estamos dispuestos a recolectar.

Si borras `~/.beheld/` por completo y ejecutas `beheld init` de nuevo, cuenta como nueva instalación. Es inevitable y aceptable; ocurre raramente.

### Lo que está garantizado en código

- El schema de la tabla `installs` tiene **solo** los 4 campos: `id`, `os`, `version`, `timestamps`. El test `spec/requests/installs_spec.rb` falla si se agrega cualquier campo sin actualizar este documento.
- El `InstallsController` no toca `request.ip`, `request.user_agent`, `request.headers`, ni `request.env`. El test lee el source y falla si se agrega alguna de esas referencias.
- El cliente CLI (`packages/cli/src/install/counter.ts`) solo lee `BEHELD_DATA_DIR` y `BEHELD_NO_TELEMETRY` del environment. Un test regex falla si se toca cualquier otra variable de entorno.

Cualquier expansión de esta lista requiere bump de este documento, bump de los tests de privacidad del servidor y del cliente, y bump del disclosure visible en `beheld init`. La lista es cláusula pétrea.
