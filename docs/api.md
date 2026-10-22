# API HTTP y eventos en tiempo real

Base URL en desarrollo: `http://localhost:4000` (Vite hace proxy desde `/api`).
Autenticación: `Authorization: Bearer <token>`.

El token es una sesión anónima firmada. No hay usuarios ni contraseñas. Se obtiene con `POST /api/session`.

## 1. Formato de error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "details": [{ "path": "config.scoringWeights", "message": "..." }]
  }
}
```

Códigos habituales: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `DATABASE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).

## 2. Salud y metadatos

### `GET /api/health`
Sin auth.

```json
{
  "status": "ok",
  "name": "LIFE DUEL",
  "version": "1.0.0",
  "persistence": "json",
  "ai": "local",
  "time": "2026-01-01T00:00:00.000Z"
}
```

### `GET /api/meta/demographics`
Sin auth. Devuelve versión, fuentes, notas y opciones de país. Cache 1 h.

## 3. Sesión

### `POST /api/session`
```json
{ "alias": "Luna" }
```
Alias opcional, 2–18 caracteres. Respuesta `201`:

```json
{
  "playerId": "uuid",
  "token": "payload.firma",
  "alias": "Luna",
  "expiresAt": "…"
}
```

### `GET /api/me`
Requiere auth. Devuelve `playerId`, `alias`, `expiresAt`.

## 4. Partidas individuales

### `POST /api/games`
Requiere auth.

```json
{
  "alias": "Luna",
  "config": {
    "era": "present",
    "countryMode": "weighted",
    "fixedCountry": "ESP",
    "fixedYear": 2001,
    "maxAge": 85,
    "difficulty": "equilibrada",
    "autoDecisions": false,
    "decisionTimerSeconds": 0,
    "speed": 4,
    "scoringWeights": {
      "health": 20, "happiness": 20, "knowledge": 15,
      "relationships": 15, "economic": 15, "education": 10, "longevity": 5
    },
    "content": { "severity": "full" }
  }
}
```
Respuesta `201`: `{ "game": GameView }`.

### `GET /api/games`
Lista resumida de las partidas del jugador.

### `GET /api/games/:id`
Vista personalizada. Solo miembros.

### `POST /api/games/:id/advance`
Modo narrativo manual. Resuelve **exactamente un año**. En individual exige que no haya una decisión pendiente. En duelo solo se permite cuando el año no tiene ningún prompt pendiente; si lo hay, responde `409` y el avance ocurre al decidir ambos. Devuelve `{ game: GameView }`.

### `POST /api/games/:id/focus`
```json
{ "focus": "study" }
```
Valores: `balanced`, `study`, `relationships`, `health`, `work`, `hobbies`. Disponible desde los 6 años en partidas narrativas; modifica la evolución anual sin sustituir la decisión principal.

### `POST /api/games/:id/decision`
```json
{
  "turn": 3,
  "decisionId": "estudiar_formacion",
  "optionId": "formacion_profesional",
  "idempotencyKey": "d3:formacion_profesional:uuid"
}
```
Respuesta: `{ accepted, duplicate, waitingFor, turnResolved, game }`.

Reglas:
- `turn` debe coincidir con el pendiente.
- La decisión y opción deben pertenecer al prompt del jugador.
- La opción debe seguir siendo elegible.
- La misma clave con los mismos datos devuelve `duplicate: true`; con otros datos, `409`.

### `POST /api/games/:id/spending`
Requiere auth y vida activa. Ejecuta una acción manual validada por el servidor (`solicitar-prestamo`, `comprar`, `vender`, `invertir`, `repay-debt`, etc.).

Pago dirigido de una deuda concreta:

```json
{
  "action": "repay-debt",
  "targetId": "loan:<id>",
  "amount": 100,
  "idempotencyKey": "repay-2026-...-uuid"
}
```

`targetId` admite `loan:<id>`, `asset:<id>` (hipoteca) u `other` (deuda residual). El servidor comprueba que la deuda pertenece al personaje, que el importe es positivo, que no supera el saldo disponible ni el pendiente y que la clave de idempotencia no se reutiliza con otros datos. En duelo solo se permite `repay-debt` como acción manual; las compras e inversiones siguen reservadas al modo individual. Si la partida terminó o el personaje ha muerto, la operación se rechaza para no alterar un resultado cerrado.

### `POST /api/games/:id/funeral`
Resuelve una despedida pendiente. Requiere auth y que el funeral pertenezca al personaje.

```json
{
  "funeralId": "funeral-...",
  "choice": "intima",
  "idempotencyKey": "funeral-2026-...-uuid"
}
```

`choice`: `intima`, `grande` o `sin_ceremonia`. La muerte no cobra nada; este endpoint aplica el coste (saldo y, si falta, deuda), actualiza bienestar y deja la decisión en el historial. Si el personaje es menor de edad, el coste personal es 0 y se narra como gasto del hogar. Repetir la misma `idempotencyKey` con el mismo cuerpo devuelve `duplicate: true`; con otro cuerpo, `409`. Si la partida terminó o el personaje ha muerto, se rechaza para conservar cerrado el resultado.


### `POST /api/games/:id/pause`
```json
{ "paused": true }
```

### `POST /api/games/:id/speed`
```json
{ "speed": 8 }
```
Valores: 1, 2, 4, 8, 16.

### `POST /api/games/:id/auto`
```json
{ "enabled": true, "decisionTimerSeconds": 30 }
```
En duelo, ambos deben habilitarlo para activar el modo. Solo el anfitrión puede cambiar el temporizador.

### `POST /api/games/:id/leave`
Marca abandono en duelo. `204`.

### `GET /api/games/:id/history`
Devuelve turnos con eventos compartidos, decisiones reveladas, tiradas, efectos, economía, muerte e hitos. Solo miembros.

### `GET /api/games/:id/export`
Descarga JSON completo con `Content-Disposition`.

### `POST /api/games/:id/narrative`
Solo al terminar. Genera epílogo local o DeepSeek si está configurado. Respuesta `{ text, source, notice? }`.

### `POST /api/games/:id/rematch`
Solo duelo finalizado. Cuerpo opcional `{ config }`. Crea una sala nueva y devuelve `201 { lobby }`.

## 5. Salas

### `POST /api/rooms`
Requiere auth. `{ alias, config }` → `201 { lobby }`. Genera código único.

### `GET /api/rooms/:code`
Sin auth. Preview público limitado: host, estado, resumen de nacimiento, configuración y caducidad. No expone decisiones ni personajes.

### `POST /api/rooms/join`
Requiere auth. `{ code, alias }`. Solo un segundo jugador; rechaza un tercero, al anfitrión repetido o salas iniciadas.

### `GET /api/rooms/:code/lobby`
Requiere ser miembro. Devuelve estado de sala y presencia.

### `PATCH /api/rooms/:code/config`
Solo anfitrión y solo en `waiting`/`ready`. Reinicia «listo» y recalcula el nacimiento compartido.

### `POST /api/rooms/:code/ready`
`{ ready: true }`.

### `POST /api/rooms/:code/start`
Solo anfitrión. Exige dos jugadores presentes y listos.

### `POST /api/rooms/:code/leave`
Abandona la sala. `204`.

## 6. Socket.IO

URL: misma que la API. Handshake:

```ts
io("http://localhost:4000", { auth: { token } });
```

Sin token válido: `connect_error` con `No autorizado.`.

### Eventos cliente → servidor

| Evento | Payload | Ack |
| --- | --- | --- |
| `game:subscribe` | `{ gameId }` | `{ ok, code?, message? }` |
| `room:subscribe` | `{ gameId }` | `{ ok, … }` |
| `game:unsubscribe` | `{ gameId }` | — |
| `game:decision` | `{ gameId, turn, decisionId, optionId, idempotencyKey }` | `{ ok, result? , code?, message? }` |

### Eventos servidor → cliente

| Evento | Contenido |
| --- | --- |
| `game:update` | `GameView` personalizada. |
| `room:update` | `LobbyView` personalizada. |
| `rematch:created` | `{ gameId, code }` para la sala antigua. |
| `app:error` | `{ code, message }` saneado. |

Cada socket recibe su propia vista. La elección pendiente del rival nunca se emite antes de resolver el turno.

## 7. Límites

- HTTP: 180 req/min en producción, 600 en desarrollo; desactivado en test.
- Socket: límite por ventana de un minuto (`SOCKET_RATE_LIMIT_PER_MINUTE`).
- Cuerpo JSON: 64 kB.
- Códigos de sala: 6 caracteres, alfabeto sin `0/O/1/I` ambiguos.
- Sesión: 30 días.

## 8. Ejemplo mínimo con curl

```bash
BASE=http://localhost:4000

SESSION=$(curl -s -X POST $BASE/api/session \
  -H 'Content-Type: application/json' \
  -d '{"alias":"Luna"}')

TOKEN=$(echo "$SESSION" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token')

curl -s $BASE/api/games \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "alias":"Luna",
    "config":{
      "era":"present","countryMode":"fixed","fixedCountry":"ESP",
      "maxAge":85,"difficulty":"equilibrada","autoDecisions":false,
      "decisionTimerSeconds":0,"speed":4,
      "scoringWeights":{"health":20,"happiness":20,"knowledge":15,"relationships":15,"economic":15,"education":10,"longevity":5},
      "content":{"severity":"full"}
    }
  }'
```

## 9. Validación compartida

Los esquemas viven en `shared/src/schemas.ts` y se usan en HTTP y sockets. El cliente puede usarlos para validación temprana, pero el servidor siempre vuelve a validar.
