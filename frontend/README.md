# bApka — frontend

Aplikacja mobilna **Expo ~54 / React Native** (Expo Router). Perspektywy UI odpowiadają rolom backendu. Przegląd całego projektu: [../README.md](../README.md).

## Perspektywy (`app/`)

| Grupa tras | Rola | Charakter UI |
|------------|------|----------------|
| `(caretaker)/` | Opiekun | Dashboard, pairing, profil podopiecznego, terapie, insights |
| `(dependent)/` | Podopieczny | Minimalizm seniora, duży przycisk dawki, SOS |
| `(hybrid)/` | Senior samodzielny | Przycisk dawki + zarządzanie własnymi terapiami |

Wspólne: onboarding, login, zgody, ustawienia powiadomień / dźwięków, `sos-alarm`.

Wytyczne wizualne i a11y: [../brandGuidelines.md](../brandGuidelines.md).

## Setup

```bash
cp .env.example .env
npm install
npx expo start
```

Dev client (natywny push / SOS / Notifee):

```bash
npm run start:dev
```

### Połączenie z API

| Środowisko | Przykładowe `EXPO_PUBLIC_API_URL` |
|------------|----------------------------------|
| Emulator Android | `http://10.0.2.2:3000` |
| Telefon (LAN) | `http://192.168.x.x:3000` |
| Web / ten sam host | `http://localhost:3000` |

Backend musi być uruchomiony (Docker lub `npm run start:dev` w `backend/`).

### Google Sign-In (opcjonalnie)

```bash
npm run google:setup
```

Uzupełnij w `.env`:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (APK)

Te same Client ID po stronie backendu: `GOOGLE_CLIENT_ID`.

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `EXPO_PUBLIC_API_URL` | Bazowy URL Nest API |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | OAuth web |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | OAuth Android |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Projekt EAS |
| `EXPO_PUBLIC_DEV_SENIOR_PREVIEW` | Dev: podgląd UI seniora bez pełnego backendu |

Szablon: `.env.example`.

## Architektura frontu (skrót)

```text
app/           # Expo Router (file-based routes)
components/    # UI: caretaker / senior / hybrid / insights
context/       # Auth, Meds, toury, preferencje wyświetlania
services/      # API client, session, push, SOS, i18n helpers
locales/       # pl.json, en.json
```

Klient HTTP dołącza `Authorization: Bearer <token>` (sesja z Secure Store).

## Build (EAS)

Package Android: **`com.bapka.app`** (nie zmieniać po publikacji w Play).

```bash
npm run build:dev:android        # APK + development client
npm run build:preview:android    # APK wewnętrzny
npm run build:prod:android       # AAB produkcyjny
npm run submit:android           # upload do Play (internal track)
npm run credentials:android
```

Profile: [`eas.json`](eas.json). Wymagane: konto Expo, `google-services.json` (FCM) dla buildów z push/SOS.

## Testy i jakość

```bash
npm test
npm run test:cov
npm run lint
```

Pokrycie: helpery (PIN, kalendarz, mood/insights charts, i18n parity, toury) — nie pełne E2E ekranów.

## Prawne / formalne

Teksty regulaminu i prywatności: `formal_files/` (PL + EN), ekrany `legal-terms` / `legal-privacy` w aplikacji.
