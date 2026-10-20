# bApka — backend

NestJS 11 API dla aplikacji opieki nad seniorem. Persystencja: **Prisma 7 + PostgreSQL**. Przegląd całego projektu: [../README.md](../README.md).

## Moduły

| Moduł | Odpowiedzialność |
|-------|------------------|
| `auth` | Rejestracja, login, Google ID token → JWT |
| `users` | Profil, role, PIN pairing, settings, mood, SOS, metrics |
| `schedules` | Harmonogramy dawek, DoseLog, stats, mark TAKEN/MISSED |
| `inventory` | Magazyn leków, depletion, alerty (przez cron/notifications) |
| `notifications` | Expo Push + Firebase SOS |
| `cron` | Przypomnienia, miss detection, alerty magazynu |
| `common` | Strefa czasowa, okna dawek, **access-control** |
| `iot` | Stub — integracja urządzeń w przygotowaniu |

## Setup

```bash
cp .env.example .env
# Wymagane: JWT_SECRET, DATABASE_URL

npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

- API: http://localhost:3000  
- Swagger: http://localhost:3000/api → **Authorize** → Bearer token  

Z Docker Compose (zalecane): zobacz root README — `docker compose up --build`.

## Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `JWT_SECRET` | **tak** | Sekret JWT (aplikacja nie startuje bez niego) |
| `DATABASE_URL` | tak | np. `postgresql://bapka_user:bapka_password@localhost:5433/bapka_db?schema=public` |
| `JWT_EXPIRES_IN` | nie | Domyślnie `7d` |
| `CORS_ORIGINS` | w produkcji | Origins oddzielone przecinkami |
| `APP_TIMEZONE` | nie | Domyślnie `Europe/Warsaw` |
| `GOOGLE_CLIENT_ID` | nie | Audience dla Google Sign-In |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | SOS | np. `firebase-service-account.json` (**nie commitować**) |

Pełny szablon: `.env.example`.

## Migracje

```bash
npx prisma migrate deploy    # środowisko / CI / Docker
npx prisma migrate dev       # lokalne tworzenie nowych migracji
npx prisma generate
```

Historia: `prisma/migrations/`.

Jeśli baza powstała wcześniej przez `db push`:

```bash
# A) reset volume Dockera
docker compose down -v && docker compose up --build

# B) oznacz istniejącą migrację init jako zastosowaną
npx prisma migrate resolve --applied 20260420120000_init
```

## Autoryzacja i dostęp

```http
Authorization: Bearer <access_token>
```

- `schedules` i `inventory` — zawsze z JWT  
- Odczyt/zapis po `userId` / id zasobu — **właściciel** albo **sparowany caretaker**  
- Brak tokena → 401/403; cudzy zasób → **403**

## Testy

| Skrypt | Co robi | Wymaga Dockera? |
|--------|---------|-----------------|
| `npm test` | Unit (`src/**/*.spec.ts`) | nie |
| `npm run test:e2e` | Integration HTTP, Prisma **mock** (`test/integration/`, `test/app.e2e-spec.ts`) | nie |
| `npm run test:e2e:live` | API e2e na **prawdziwym** Postgresie | **tak** |
| `npm run test:all` | Unit + mock e2e | nie |
| `npm run lint` | ESLint | nie |

### Live e2e (API + Postgres)

Suite w `test/e2e/` startuje pełny Nest `AppModule` (prawdziwy JWT, bez nadpisywania `JwtAuthGuard`), łączy się z izolowaną bazą i czyści tabele przed każdym testem (`TRUNCATE … CASCADE`).

```bash
npm run test:e2e:live
# kroki: test:e2e:live:up → test:e2e:live:migrate → Jest (runInBand)
```

| Element | Wartość |
|---------|---------|
| Compose | `../docker-compose.e2e.yml` → `bapka_db_e2e` |
| Port / DB | `localhost:5434` / `bapka_e2e` |
| Config Jest | `test/e2e/jest-e2e-live.json` |
| Specs | `domain.e2e-spec.ts`, `security.e2e-spec.ts` |

**`domain.e2e-spec.ts`** — jeden przepływ opieki: register (opiekun + podopieczny) → `generate-pin` / `pair-with-pin` → `POST inventory` + `POST schedules` → `GET schedules` → `PATCH …/mark` (TAKEN) → stats → `DELETE inventory` → `POST /users/me/sos` (+ lista SOS dla opiekuna).

**`security.e2e-spec.ts`** — brak `Authorization`; niesparowany caretaker → 403 na schedule; cudze inventory → 403; niepoprawne `time` → 400.

Powiadomienia (`NotificationsService` / Firebase) i `CronService` są **nadpisane stubami**, żeby test nie zależał od FCM ani od crona co minutę.

Pozostałe skrypty: `start:dev`, `build`, `start:prod` — jak wcześniej.

## Statusy dawek

`PENDING` → `TAKEN` / `LATE` / `MISSED`  
Źródła logów: `APP_SENIOR`, `APP_CARETAKER`, `SYSTEM_AUTO` (cron).
