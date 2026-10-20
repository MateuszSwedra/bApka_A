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

## Skrypty npm

| Skrypt | Opis |
|--------|------|
| `npm run start:dev` | Watch + `prisma generate` |
| `npm run build` / `start:prod` | Build produkcyjny |
| `npm test` | Unit (`src/**/*.spec.ts`) |
| `npm run test:e2e` | Integration + e2e (`test/`) |
| `npm run test:all` | Unit + e2e |
| `npm run lint` | ESLint |

## Statusy dawek

`PENDING` → `TAKEN` / `LATE` / `MISSED`  
Źródła logów: `APP_SENIOR`, `APP_CARETAKER`, `SYSTEM_AUTO` (cron).
