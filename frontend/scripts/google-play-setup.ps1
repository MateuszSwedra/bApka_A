# Konfiguracja Google Sign-In + Google Play przez EAS Build
# Uruchom: npm run google:setup

$ErrorActionPreference = "Continue"
$Package = "com.bapka.app"

Write-Host ""
Write-Host "=== bApka - Google Android + Play Store [EAS Build] ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package name (Google Cloud + Play Store):" -ForegroundColor Yellow
Write-Host "  $Package"
Write-Host ""
Write-Host "KROK 1 - konto Expo" -ForegroundColor Green
Write-Host '  npx eas login'
Write-Host '  npx eas init          # utworzy projekt EAS i doda projectId'
Write-Host ""
Write-Host "KROK 2 - pierwszy build (EAS wygeneruje keystore i SHA-1)" -ForegroundColor Green
Write-Host '  npm run build:dev:android'
Write-Host ""
Write-Host "KROK 3 - pobierz SHA-1 certyfikatu" -ForegroundColor Green
Write-Host '  npm run credentials:android'
Write-Host '  -> wybierz build credentials -> pokaz SHA-1 Fingerprint'
Write-Host ""
Write-Host "KROK 4 - Google Cloud Console (console.cloud.google.com)" -ForegroundColor Green
Write-Host '  Credentials -> Create OAuth client ID:'
Write-Host '    [Web application]     -> EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID + GOOGLE_CLIENT_ID'
Write-Host '    [Android]             -> EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID + GOOGLE_ANDROID_CLIENT_ID'
Write-Host "      Package: $Package"
Write-Host '      SHA-1:   z kroku 3'
Write-Host '  OAuth consent screen -> dodaj siebie jako Test user (tryb testowy)'
Write-Host ""
Write-Host "KROK 5 - sekrety na EAS (build w chmurze)" -ForegroundColor Green
Write-Host '  npx eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value TWOJ_WEB_CLIENT_ID'
Write-Host '  npx eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value TWOJ_ANDROID_CLIENT_ID'
Write-Host ""
Write-Host '  Lokalnie tez w frontend/.env (dev) i backend/.env'
Write-Host ""
Write-Host "KROK 6 - rebuild z sekretami" -ForegroundColor Green
Write-Host '  npm run build:dev:android'
Write-Host '  Zainstaluj APK na telefonie i przetestuj logowanie Google'
Write-Host ""
Write-Host "KROK 7 - publikacja Play Store" -ForegroundColor Green
Write-Host '  npm run build:prod:android     # AAB do sklepu'
Write-Host '  npm run submit:android         # wrzuca do Play Console (track: internal)'
Write-Host ""
Write-Host '  Po pierwszym uploadzie: Play Console -> App integrity -> App signing'
Write-Host '  Skopiuj SHA-1 z Play i DODAJ do tego samego klienta Android w Google Cloud'
Write-Host '  EAS SHA-1 = testy; Play SHA-1 = uzytkownicy ze sklepu'
Write-Host ""
