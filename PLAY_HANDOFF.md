# Handoff: Google Play Internal testing

Dokument dla Ciebie i kolegi z kontem deweloperskim Play.  
Package: **`com.bapka.app`** — nie zmieniać.

---

## Co już jest zrobione w repo

| Element | Gdzie |
|---------|--------|
| Ikony aplikacji + splash (bez siatek projektowych) | `frontend/assets/images/` |
| Ikona 512 + feature graphic pod listing | `store/graphics/` |
| Polityka / regulamin HTML (do hostingu) | `store/legal/` |
| Teksty listingu PL/EN | `store/LISTING.md` |
| Szkic Data safety | `store/DATA_SAFETY.md` |
| EAS: AAB + submit na **internal / draft** | `frontend/eas.json` |
| `.env.example` z opisem prod | `frontend/`, `backend/` |

Stare szablony z guide’ami (jeśli potrzebujesz): `frontend/assets/images/_old_templates/`.

---

## Twoja checklista (zanim oddasz pracę)

### 1. Backend na Render (HTTPS)
Bez tego Internal testing nie ma sensu — apka ze sklepu nie dogada się z `localhost`.

`backend/Dockerfile` jest pod **produkcję** (`prisma migrate` + `start:prod`). Lokalny `docker-compose` nadal używa `start:dev`.

**Render — checklista:**
1. Web Service → Root Directory: `backend`, Dockerfile Path: `Dockerfile` (nie `docker-compose.yml`).
2. Environment:
   - `DATABASE_URL` = connection string Postgres (Supabase / Render Postgres)
   - `JWT_SECRET` = długi losowy ciąg
   - `APP_TIMEZONE=Europe/Warsaw`
   - opcjonalnie `CORS_ORIGINS` (przy `NODE_ENV=production` bez tego CORS jest zamknięty — dla samej apki mobilnej zwykle OK)
3. Push zmian z repo → **Manual Deploy**.
4. Sprawdź: `https://TWOJA-USŁUGA.onrender.com/` (powinno coś zwrócić, np. Hello World) oraz `/api` (Swagger).

### 2. EAS Secrets (lub env przy buildzie)
W [expo.dev](https://expo.dev) → projekt bapka → Secrets / Environment variables dla profilu **production**:

```
EXPO_PUBLIC_API_URL=https://TWOJE-API
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
```

(`EXPO_PUBLIC_EAS_PROJECT_ID` już jest w `app.config.ts` jako fallback.)

### 3. Opublikuj privacy policy (URL dla Play)
Najprościej — **GitHub Pages** z folderu `store/legal`:

1. Upewnij się, że `store/legal` jest na GitHubie (push).
2. Repo → **Settings → Pages** → Source: Deploy from branch → `/` lub `/docs`.  
   Jeśli Pages serwuje root repo, wygodniej skopiować zawartość `store/legal` do `docs/` **albo** użyć osobnego repo `bapka-legal`.
3. Publiczny URL będzie wyglądał np.:  
   `https://<user>.github.io/<repo>/store/legal/`  
   albo `https://<user>.github.io/bapka-legal/`
4. Otwórz w przeglądarce i skopiuj link do **Polityki (PL)** — to wkleja kolega w Play Console.

Alternatywy: Notion (Share → Publish), Cloudflare Pages, zwykły hosting uczelniany.

### 4. Zrzuty ekranu (2–8 szt.)
Na telefonie z zainstalowaną apką (dev/preview):
- Welcome / logowanie  
- Dashboard opiekuna  
- Ekran seniora (duży przycisk)  
- Kalendarz / apteczka  

Przenieś pliki do `store/graphics/screenshots/` (folder możesz utworzyć) i przekaż koledze.

### 5. Dostępy dla kolegi
- Zaproszenie do repo GitHub  
- Zaproszenie do projektu **Expo / EAS** (rola mogąca build + submit)  
- Link do privacy policy  
- URL API + potwierdzenie że działa  
- Ten plik (`PLAY_HANDOFF.md`) + `store/LISTING.md` + `store/DATA_SAFETY.md`

### 6. (Opcjonalnie) Smoke build u Ciebie
```bash
cd frontend
npx eas-cli build --profile production --platform android
```
Nie musisz submitować na Play kolegi — wystarczy, że AAB się buduje.

---

## Checklist kolegi (Play Console)

1. Utwórz aplikację z package **`com.bapka.app`**.  
2. Wklej listing z `store/LISTING.md` + wrzuć `store/graphics/*` + screenshots.  
3. Privacy policy URL → `store/legal` (hostowany).  
4. Data safety / content rating / FSI — wg `store/DATA_SAFETY.md`.  
5. Build + submit (z Waszego EAS lub jego):
   ```bash
   cd frontend
   npm run build:prod:android
   npm run submit:android
   ```
   (`eas.json` → track **internal**, status **draft**).  
6. Internal testing → dodaj e-maile testerów → **Start rollout**.  
7. Wyślij testerom link opt-in z Console.

---

## Jak ogarnąć ikony (jeśli chcesz je zmienić później)

Masz już zestaw startowy w `frontend/assets/images/`. Żeby wymienić:

1. Zrób logo **kwadrat 1024×1024** PNG (bez przezroczystości na głównym `icon.png` albo z tłem).  
2. Adaptive Android = **dwie warstwy**:
   - `android-icon-foreground.png` — sam znak (bezpieczna strefa: środek ~66%)  
   - `android-icon-background.png` — jednolite tło (u Was `#E6F4FE`)  
3. `splash-icon.png` — logo na jasnym tle.  
4. Do Play listingu osobno: **512×512** (`store/graphics/icon-512.png`) i feature graphic ~**1024×500**.

Narzędzia bez kodu:
- [Icon Kitchen](https://icon.kitchen/) — wrzuć logo, pobierz Android adaptive  
- Figma / Canva — feature graphic  
- Po podmianie plików: nowy `eas build` (ikona jest w AAB).

**Package `com.bapka.app` zostaje na zawsze** — ikonę możesz zmieniać w każdej wersji.

---

## Częste problemy

| Objaw | Co sprawdzić |
|-------|----------------|
| Build pada na assetach | Czy istnieją wszystkie pliki z `app.config.ts` |
| Apka w sklepie nie loguje | `EXPO_PUBLIC_API_URL` w EAS production + HTTPS |
| Console wymaga policy | Hostowany `store/legal` |
| Brak powiadomień / SOS | `google-services.json`, Firebase Admin na serwerze, uprawnienia na telefonie |
| Submit nie wchodzi na konto kolegi | On musi mieć dostęp do Play app + EAS credentials / service account |

---

## Kontakt w dokumentach prawnych

Obecnie: `danpas@st.amu.edu.pl` — zmieńcie w `store/legal/*.html` i w `frontend/app/consents.tsx`, jeśli ma być inny adres zespołu.
