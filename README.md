# bApka

Aplikacja mobilna wspierająca **opiekę nad osobą starszą**: harmonogram leków, przypomnienia, magazyn tabletek, nastrój i parametry zdrowotne, panel insights dla opiekuna oraz alarm **SOS**.

| | |
|---|---|
| **Platforma** | Android (Expo / React Native), opcjonalnie web w dewie |
| **Backend** | NestJS + Prisma + PostgreSQL |
| **Języki UI** | Polski, angielski |
| **Package** | `com.bapka.app` |

Projekt inżynierski — współautorzy: Mateusz Swędra, Dominika Wabich, Daniel Pasternak, Aleksandra Nowak (`Notka_prawna.txt`).

---

## Spis treści

1. [Funkcje](#funkcje)
2. [Role użytkowników](#role-użytkowników)
3. [Architektura](#architektura)
4. [Struktura repozytorium](#struktura-repozytorium)
5. [Wymagania](#wymagania)
6. [Szybki start](#szybki-start)
7. [Konfiguracja środowiska](#konfiguracja-środowiska)
8. [API](#api)
9. [Bezpieczeństwo](#bezpieczeństwo)
10. [Testy](#testy)
11. [Build i dystrybucja](#build-i-dystrybucja)
12. [Dokumentacja powiązana](#dokumentacja-powiązana)
13. [Ograniczenia i roadmap](#ograniczenia-i-roadmap)

---

## Funkcje

### Opiekun (CARETAKER)
- Dashboard z listą podopiecznych i statusem aktywności
- Parowanie kontem podopiecznego przez **6-cyfrowy PIN**
- Dodawanie / edycja terapii i harmonogramów dawek
- Kalendarz, magazyn leków, alerty niskiego stanu
- Insights: adherence (dawki), nastrój, metryki zdrowotne
- Powiadomienia o wzięciu / pominięciu dawki oraz o SOS

### Podopieczny z opiekunem (DEPENDENT)
- Minimalistyczny UI seniora (duże cele klikalne, bez hamburger menu)
- Gigantyczny przycisk potwierdzenia dawki w oknie czasowym
- Harmonogram, ustawienia dostępności (kontrast, daltonizm, język)
- Wpis nastroju, opcjonalnie parametry zdrowotne
- Alarm **SOS** (full-screen intent / FCM / Notifee na Androidzie)

### Senior samodzielny (HYBRID)
- Połączenie widoku seniora z możliwością samodzielnego zarządzania terapiami (jak opiekun dla siebie)

### Automatyka po stronie serwera
- Co minutę: przypomnienia o lekach, przypomnienia o nastroju, oznaczanie dawek jako **MISSED**
- Codziennie: alerty magazynu (niski / pusty stan)
- Strefa czasowa harmonogramów: `Europe/Warsaw` (`APP_TIMEZONE`)

---

## Role użytkowników

```text
                    ┌─────────────┐
                    │   CARETAKER │
                    │  (opiekun)  │
                    └──────┬──────┘
                           │ PIN pairing
                           ▼
                    ┌─────────────┐
                    │  DEPENDENT  │
                    │ (podopieczny)│
                    └─────────────┘

                    ┌─────────────┐
                    │   HYBRID    │
                    │ (samodzielny)│
                    └─────────────┘
```

| Rola | Opis |
|------|------|
| `CARETAKER` | Zarządza sparowanymi podopiecznymi |
| `DEPENDENT` | Senior z opiekunem — uproszczony UI |
| `HYBRID` | Senior bez opiekuna — self-care + zarządzanie lekami |

**Dostęp do danych:** użytkownik ma dostęp do własnych zasobów; opiekun — do zasobów **sparowanego** podopiecznego. Obce `userId` → HTTP **403**.

---

## Architektura

```mermaid
flowchart LR
  subgraph Mobile["Frontend (Expo)"]
    C[Caretaker UI]
    D[Dependent UI]
    H[Hybrid UI]
    P[Push / SOS / Notifee]
  end

  subgraph API["Backend (NestJS)"]
    Auth[Auth JWT / Google]
    Users[Users + pairing]
    Sched[Schedules + DoseLog]
    Inv[Inventory]
    Notif[Notifications]
    Cron[Cron]
  end

  DB[(PostgreSQL)]
  FCM[Firebase FCM]
  ExpoPush[Expo Push]

  C & D & H -->|HTTPS + Bearer JWT| Auth
  Auth --> Users & Sched & Inv
  Cron --> Sched & Notif
  Notif --> ExpoPush & FCM
  Users & Sched & Inv --> DB
  P --> FCM
```

| Warstwa | Technologie |
|---------|-------------|
| Frontend | Expo ~54, React Native, Expo Router, i18next, Notifee, RN Firebase |
| Backend | NestJS 11, Passport JWT, Prisma 7, `@nestjs/schedule`, Swagger |
| Baza | PostgreSQL 15 |
| Infra | Docker Compose, EAS Build |

---

## Struktura repozytorium

```text
bApka_A/
├── backend/                 # NestJS API
│   ├── prisma/              # schema + migrations
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── schedules/
│   │   ├── inventory/
│   │   ├── notifications/
│   │   ├── cron/
│   │   ├── iot/             # stub — integracja urządzeń w przygotowaniu
│   │   └── common/          # timezone, access-control, …
│   └── test/                # integration + e2e
├── frontend/                # Expo app
│   ├── app/
│   │   ├── (caretaker)/
│   │   ├── (dependent)/
│   │   └── (hybrid)/
│   ├── components/
│   ├── context/
│   ├── services/
│   └── formal_files/        # regulamin / prywatność
├── docker-compose.yml
├── brandGuidelines.md       # UX / WCAG / Material
└── README.md                # ten plik
```

Szczegóły setupu: [`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md).

---

## Wymagania

- **Node.js** 20+ (zalecane LTS)
- **npm** 10+
- **Docker** + Docker Compose (zalecane do bazy i API)
- Do push/SOS na urządzeniu: konto Firebase + `google-services.json` / service account (opcjonalne w samym UI)

---

## Szybki start

### 1. Backend + baza (Docker)

```bash
cp backend/.env.example backend/.env
# Ustaw co najmniej JWT_SECRET (losowy długi ciąg).
# DATABASE_URL w Compose jest nadpisywany na wewnętrzny host `db`.

docker compose up --build
```

| Usługa | Adres |
|--------|--------|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api |
| PostgreSQL | `localhost:5433` (user/hasło/db: `bapka_user` / `bapka_password` / `bapka_db`) |

Przy starcie kontenera API: `prisma migrate deploy`, potem `npm run start:dev`.

**Istniejąca baza z dawnego `db push`:** albo świeży volume (`docker compose down -v`), albo:

```bash
cd backend
npx prisma migrate resolve --applied 20260420120000_init
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://<IP-komputera>:3000   # telefon w LAN
# EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...              # opcjonalnie Google login

npm install
npx expo start
# Dev client (FCM / SOS): npm run start:dev
```

Na emulatorze Android często: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`.

### 3. Backend bez Dockera (opcjonalnie)

```bash
# Postgres lokalnie lub tylko usługa `db` z Compose
cd backend
cp .env.example .env
# DATABASE_URL=postgresql://bapka_user:bapka_password@localhost:5433/bapka_db?schema=public
# JWT_SECRET=...

npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

---

## Konfiguracja środowiska

### Backend (`backend/.env`)

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `JWT_SECRET` | **tak** | Sekret podpisu JWT (brak fallbacku w kodzie) |
| `DATABASE_URL` | tak* | Connection string (*w Compose nadpisywany) |
| `JWT_EXPIRES_IN` | nie | Domyślnie `7d` |
| `CORS_ORIGINS` | prod | Lista origins oddzielona przecinkami |
| `APP_TIMEZONE` | nie | Domyślnie `Europe/Warsaw` |
| `GOOGLE_CLIENT_ID` | nie | Weryfikacja Google ID token |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | SOS | Ścieżka do JSON service account (nie commitować) |

### Frontend (`frontend/.env`)

| Zmienna | Opis |
|---------|------|
| `EXPO_PUBLIC_API_URL` | Bazowy URL API |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Logowanie Google (web / Expo) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Logowanie Google (APK) |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Projekt EAS |

Pomocnik Google: `cd frontend && npm run google:setup`.

---

## API

- Dokumentacja interaktywna: **Swagger** → http://localhost:3000/api  
- Autoryzacja: przycisk **Authorize** → `Bearer <access_token>`

Główne obszary:

| Prefiks | Opis |
|---------|------|
| `POST /auth/register`, `/auth/login`, Google | Rejestracja / logowanie → JWT |
| `/users/...` | Profil, PIN, pairing, settings, mood, SOS, metrics |
| `/schedules/...` | Harmonogramy, logi dawek, stats, mark TAKEN/MISSED |
| `/inventory/...` | Magazyn leków, depletion |

Wszystkie wrażliwe endpointy wymagają JWT. Tworzenie/odczyt po `userId` — tylko **self** lub **sparowany caretaker**.

---

## Bezpieczeństwo

- Hasła: bcrypt  
- JWT bez hardcoded secret; konfigurowalny TTL  
- Globalny `ValidationPipe` (whitelist + DTO na schedules/inventory)  
- `AccessControlService` — ochrona przed IDOR  
- CORS: w `NODE_ENV=production` wymagane `CORS_ORIGINS`  
- Pliki Firebase / `.env` — poza gitem

---

## Testy

Z katalogu głównego:

```bash
npm test                 # backend unit + frontend unit + backend e2e/integration
npm run test:backend
npm run test:frontend
```

| Pakiet | Co pokrywa |
|--------|------------|
| `backend` | Serwisy, kontrolery, access-control, cron, integration HTTP (401/403) |
| `frontend` | Helpery (PIN, kalendarz, i18n, insights, …) |

---

## Build i dystrybucja

```bash
cd frontend
npm run build:dev:android       # APK development client
npm run build:preview:android   # APK wewnętrzny
npm run build:prod:android      # AAB (Play)
npm run submit:android
```

Profile: `frontend/eas.json`. Package Android: `com.bapka.app`.

---

## Dokumentacja powiązana

| Plik | Treść |
|------|--------|
| [`brandGuidelines.md`](brandGuidelines.md) | UX seniora, WCAG, Material Design 3 |
| [`backend/README.md`](backend/README.md) | API, migracje, env backendu |
| [`frontend/README.md`](frontend/README.md) | Expo, EAS, env frontendu |
| `frontend/formal_files/` | Regulamin i polityka prywatności (PL/EN) |
| `Notka_prawna.txt` | Porozumienie współautorów |

---

## Ograniczenia i roadmap

**MVP — świadome ograniczenia**
- Cron skanuje harmonogramy co minutę (OK na skalę studencką; przy wzroście — indeksy / selektywne zapytania)
- Brak refresh-tokenów (krótki TTL JWT przez env)
- Testy frontu to głównie unit helperów (bez pełnego E2E UI)

**W przygotowaniu**
- Moduł **IoT** (`backend/src/iot`) — integracja urządzeń; prace wkrótce

---

## Licencja

`UNLICENSED` — prawa majątkowe zgodnie z `Notka_prawna.txt` (równe udziały współtwórców).
