# Publicar LIFE DUEL gratis (Render + Neon)

Esta guía publica el juego completo en Internet con **coste 0 €**:

- **Render** ejecuta el servidor Node, la API y Socket.IO, y sirve el frontend compilado.
- **Neon** guarda las partidas en PostgreSQL (plan gratuito).
- **GitHub** conecta el repositorio con Render.

No hace falta tarjeta para los planes gratuitos, aunque las condiciones pueden cambiar. Tampoco hace falta tocar el hosting ni los archivos de ningún cliente.

**[Publicar en Render](https://render.com/deploy?repo=https://github.com/CatGodd33/game)** — el botón abre el Blueprint del repositorio. Te pedirá iniciar sesión y pegar la `DATABASE_URL` de Neon; el resto lo crea Render.

---

## 1. Antes de empezar

Necesitas:

1. Una cuenta de **GitHub** con el proyecto subido. El repositorio previsto es `CatGodd33/game`.
2. Una cuenta gratuita de **Render**: <https://render.com> (puedes entrar con GitHub).
3. Una cuenta gratuita de **Neon**: <https://neon.tech> (puedes entrar con GitHub).

El proyecto ya incluye `render.yaml`, así que Render crea el servicio casi solo.

---

## 2. Crear la base de datos en Neon

1. Entra en <https://neon.tech> y pulsa **Sign up** (GitHub o Google).
2. Crea un proyecto:
   - Nombre: `life-duel`.
   - Región: **AWS eu-central-1 (Frankfurt)** para reducir latencia desde España.
   - PostgreSQL: la versión por defecto.
3. En el panel del proyecto, abre **Connect** o **Connection string**.
4. Copia la **conexión directa** (*Direct connection*), no la *Pooled connection*. Debe parecerse a:

   ```text
   postgresql://usuario:clave@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   Guarda esa URL. Es un secreto: no la subas a GitHub ni la pegues en el chat.

> **Por qué la conexión directa:** Prisma aplica migraciones al arrancar. La conexión *pooled* de Neon puede rechazar ese tipo de operación. Para este juego, con poco tráfico, la directa es suficiente.

---

## 3. Crear el servicio en Render

1. Entra en <https://dashboard.render.com> con GitHub.
2. Pulsa **New +** → **Blueprint**.
3. Autoriza a Render para leer el repositorio `CatGodd33/game` si te lo pide.
4. Selecciona el repositorio y la rama `main`.
5. Render leerá `render.yaml` y mostrará el servicio **life-duel**.
6. Cuando pida **DATABASE_URL**, pega la conexión directa de Neon del paso 2.
7. Pulsa **Apply** o **Create Blueprint**.

Render generará solo:

- `SESSION_SECRET` (secreto de sesiones).
- `NODE_ENV=production`.
- `PERSISTENCE=postgres`.
- `TRUST_PROXY=1`.

No configures `DEEPSEEK_API_KEY`: el juego funciona sin IA y así no gastas tokens.

### Nombre y URL

Si el nombre `life-duel` ya está ocupado, Render te pedirá cambiarlo. La URL será:

```text
https://<nombre-del-servicio>.onrender.com
```

El código detecta automáticamente esa URL mediante `RENDER_EXTERNAL_URL`; no tienes que configurar `CLIENT_ORIGIN` para el dominio de Render.

---

## 4. Primer despliegue y migración

El arranque ejecuta `scripts/start-production.mjs`:

1. Si `PERSISTENCE=postgres`, aplica `prisma migrate deploy`.
2. Después arranca `server/dist/index.js`.

La primera vez crea la tabla `GameRecord`. Es idempotente: en reinicios posteriores no vuelve a aplicar migraciones ya registradas.

Espera a que el estado sea **Live**. El primer build tarda varios minutos.

Comprueba:

```bash
curl https://<nombre>.onrender.com/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "name": "LIFE DUEL",
  "version": "2.2.0",
  "persistence": "postgres",
  "ai": "local"
}
```

Si `persistence` no es `postgres`, revisa la variable `PERSISTENCE` en Render.

---

## 5. Probar el juego

1. Abre `https://<nombre>.onrender.com`.
2. Pulsa **Duelo para dos** y crea una sala.
3. Copia el código de 6 caracteres.
4. Abre una ventana de incógnito o un móvil y entra en la misma URL.
5. Pulsa **Unirse a una partida**, introduce el código y el alias.
6. Ambos pulsan **Listo** y el anfitrión pulsa **Comenzar duelo**.

Comprueba que:

- Los dos reciben el mismo nacimiento.
- Los dos ven los mismos acontecimientos compartidos.
- Cada uno puede elegir una opción distinta.
- La decisión del rival no se revela hasta que ambos confirman.
- Al recargar el navegador, la partida sigue en el mismo estado.

---

## 6. Si algo falla

### El build falla en `npm ci`

- Comprueba que `package-lock.json` está en el repositorio.
- Render usa Node 22 según `render.yaml`; no cambies la versión sin probar el build local.
- Revisa los logs del build: el error real suele estar en las últimas líneas.

### `SESSION_SECRET es obligatorio en producción`

Falta la variable `SESSION_SECRET` en Render. El Blueprint la genera; si la borraste, créala con **Generate** o con:

```bash
openssl rand -hex 48
```

### Error de conexión `P1001` o la app no arranca

- Confirma que `DATABASE_URL` es la conexión **directa** de Neon y termina en `?sslmode=require`.
- Entra en Neon y comprueba que el proyecto no está suspendido.
- Si Neon está despertando, espera unos segundos y reinicia el servicio en Render.

### Migración manual (si el arranque no pudo aplicarla)

En tu ordenador, dentro del proyecto:

```bash
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" npx prisma migrate deploy
```

Después reinicia el servicio en Render: **Manual Deploy** → **Deploy latest commit** o **Restart**.

### El código está en GitHub, pero la web sirve la versión anterior

Comprueba primero que el commit está en `main`:

```bash
git log origin/main -1 --oneline
```

Si el health responde pero la portada conserva el bundle antiguo, el webhook de autoDeploy no ha lanzado el build. En Render:

1. Abre el servicio **life-duel**.
2. Entra en **Manual Deploy**.
3. Pulsa **Deploy latest commit**.
4. Espera a que el estado vuelva a **Live**; el primer build gratuito puede tardar varios minutos.
5. Fuerza una recarga sin caché y comprueba que el HTML referencia un `assets/index-*.js` nuevo.

El push a `main` no sustituye un despliegue que Render no ha recibido. No hace falta volver a crear el servicio ni cambiar `DATABASE_URL`.


### Error de CORS

- Abre la consola del navegador y mira el origen exacto que aparece.
- Si usas un dominio propio, añade en Render:

  ```text
  CLIENT_ORIGIN=https://lifeduel.tudominio.com,https://<nombre>.onrender.com
  ```

- Sin dominio propio no hace falta: `RENDER_EXTERNAL_URL` se añade solo.
- Los orígenes deben incluir `https://` y no terminar en `/`.

### La sala no avanza o el socket se desconecta

- Render free se duerme tras unos 15 minutos sin tráfico. Durante una partida activa no debería dormirse.
- Si el servicio se durmió, el primer acceso tarda 30–60 s. Recarga y espera.
- No abras la misma sesión en dos pestañas: cada jugador debe tener su propia sesión.
- Los sockets se reconectan solos; el estado vive en el servidor y en PostgreSQL.

### El primer acceso tarda mucho

Es el *cold start* del plan gratuito. No es un error. Si el juego va a tener uso constante, considera un plan de pago o un VPS; para una demo pública, el plan gratuito es suficiente.

---

## 7. Dominio propio o subdominio (opcional)

No es necesario. La URL `*.onrender.com` funciona y tiene HTTPS.

Si más adelante quieres usar un subdominio de un dominio que ya pagas:

1. En Render: **Settings** → **Custom Domains** → **Add Custom Domain**.
2. Escribe, por ejemplo, `lifeduel.tudominio.com`.
3. Render te dará un destino CNAME, normalmente `life-duel.onrender.com`.
4. En el panel DNS del dominio (cPanel → **Zone Editor** o Cloudflare):
   - Crea un registro `CNAME` con nombre `lifeduel` y el destino que indica Render.
   - Si cPanel creó antes un registro `A` para ese subdominio, bórralo y deja solo el `CNAME`.
5. Espera la verificación y el certificado HTTPS de Render.
6. Añade el dominio a `CLIENT_ORIGIN` en Render y guarda los cambios.

Esto **no toca los archivos ni la web del cliente**: solo añade un subdominio y un registro DNS. Si el dominio es de un cliente, pide permiso antes.

---

## 8. Persistencia y copias de seguridad

- Las partidas se guardan en PostgreSQL (`GameRecord.data`).
- Render free tiene disco efímero: **no uses `PERSISTENCE=json`** si quieres conservar partidas entre reinicios.
- Neon permite copias y restauración desde su panel.
- El juego permite exportar una vida completa en JSON desde el historial y la pantalla final.

### Alternativa sin Neon (solo demo)

Si no quieres crear la base de datos:

1. En Render, cambia `PERSISTENCE` a `json`.
2. Borra `DATABASE_URL`.
3. Despliega.

Las partidas se pierden cuando Render reinicia o duerme el servicio. Sirve para enseñar el juego, no para duelos que deban durar.

---

## 9. Límites del plan gratuito

| Recurso | Qué implica |
| --- | --- |
| Render Free | El servicio se duerme tras ~15 min sin tráfico; primer acceso lento. CPU y RAM modestas. |
| Disco de Render | Efímero. Sin PostgreSQL, las partidas no sobreviven a un reinicio. |
| Neon Free | Límites de almacenamiento y cómputo; la base puede suspenderse por inactividad y despertar al primer acceso. |
| DeepSeek | Desactivado. El juego usa narrativa local; no hay coste por token. |
| Dominio | `*.onrender.com` gratis. Un dominio propio cuesta aparte. |

Para un lanzamiento con muchos jugadores simultáneos hará falta un plan de pago o un VPS. Para publicar el juego y jugar con amigos, el plan gratuito es suficiente.

---

## 10. Seguridad

- No subas `.env`, `server/.data`, `DATABASE_URL` ni claves al repositorio.
- `SESSION_SECRET` y `DATABASE_URL` viven solo en Render.
- Si cambias `SESSION_SECRET`, las sesiones existentes dejan de ser válidas.
- La API key de DeepSeek, si algún día la usas, va solo en el backend.
- El servidor valida las decisiones, el dinero y las puntuaciones; el cliente no puede alterar el estado del rival.
- El repositorio incluye `.gitignore` para `node_modules`, `dist`, `.env`, `server/.data`, `test-results` y `artifacts`.

---

## 11. Comandos útiles

```bash
# Desarrollo local (frontend + backend)
npm run dev

# Verificación completa
npm run typecheck
npm test -- --run
npm run build
npm run e2e

# Producción local con persistencia JSON
npm run build
NODE_ENV=production PORT=4100 SESSION_SECRET="$(openssl rand -hex 48)" npm start

# Producción local con PostgreSQL
DATABASE_URL="postgresql://..." PERSISTENCE=postgres SESSION_SECRET="..." npm start

# Migración manual contra Neon
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" npm run prisma:deploy
```

---

## 12. Estado de esta guía

El proyecto compila y las pruebas pasan en local. La conexión contra una instancia real de Neon **no se ha podido verificar desde este entorno** porque no hay una base de datos ni credenciales disponibles. El primer despliegue lo confirma: revisa `/api/health`, crea un duelo y comprueba que sobrevive a una recarga.

Si el arranque falla en la migración, el log de Render muestra el error exacto de Prisma; con la conexión directa de Neon y `sslmode=require` suele resolverse.
