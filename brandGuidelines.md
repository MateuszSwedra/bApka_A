# Brand Guidelines & UX/UI - Projekt bApka

## 1. Wytyczne Wizualne i Dostępność (Standardy Google)
Aplikacja ma być intuicyjna dla seniorów oraz ich opiekunów. Interfejs graficzny musi bezwzględnie opierać się na standardach **Google Material Design 3** oraz zasadach dostępności **WCAG**.

* **Kolorystyka:** Zostawiam Ci swobodę w doborze palety kolorów, jednak musi ona spełniać następujące warunki:
  * Wysoki kontrast (minimalnie zgodny z WCAG AA dla tekstów).
  * Unikaj ostrej, "szpitalnej" czerwieni, która wywołuje stres. Błędy i alerty (np. pominięty lek) oznaczaj stonowanymi, ciepłymi ostrzeżeniami (np. rdzawy pomarańcz).
  * Sukces i akcje główne (wzięcie leku) powinny być wyraźne i budzące zaufanie.
* **Typografia:** Użyj standardowych krojów Google (np. `Roboto` lub systemowych fontów sans-serif). Minimalny rozmiar tekstu dla ekranów Seniora to `18px`. Zegary i kluczowe liczniki muszą być znacznie większe i pogrubione.
* **Touch Targets (Zasada Google):** Żaden klikalny element nie może być mniejszy niż `48x48 dp`.
* **Kształty:** Używaj zaokrąglonych rogów (np. `border-radius: 12px` - `16px`) oraz miękkich cieni (elevation), aby przyciski wyglądały na wyraźnie klikalne.

## 2. Architektura Ekanów (Wireframes)
Aplikacja dzieli się na 3 perspektywy. Nie używaj ukrytych menu (tzw. hamburger menu) w widokach dla Seniora.

### Faza Onboardingu (Pierwsze uruchomienie)
* **Ekran 1 (Logowanie):** Logo, standardowe pola e-mail/hasło, wyraźny przycisk logowania, opcja logowania przez Google.
* **Ekran 2 (Wybór Roli):** Dwa ogromne kafelki na pół ekranu: "OPIEKUN" oraz "PODOPIECZNY".
* **Ekran 3 (Typ Seniora):** Tylko po wyborze Podopiecznego. Wybór: "Z OPIEKUNEM" lub "SAMODZIELNY".

### Panel Opiekuna
* **Dashboard:** Górny pasek z imieniem. Lista podopiecznych w formie dużych kafelków (imię + status na pierwszy rzut oka). Pływający przycisk FAB (Floating Action Button) od Google: `[+ Dodaj podopiecznego]`.
* **Ekran Parowania:** Wyświetla 6-cyfrowy kod PIN / kod QR do połączenia kont.
* **Profil Podopiecznego:** * Duży kafelek STATUSU (np. "Ostatnia aktywność o 08:30").
  * Dolny pasek nawigacyjny (Bottom Navigation): Harmonogram (dodawanie leków), Historia (oś czasu), Powiadomienia, Ustawienia.

### Panel Podopiecznego (Niesamodzielnego)
[cite_start]Skrajny minimalizm – to Moduł Interakcji Cyfrowej dla seniora[cite: 49].
* **Ekran Parowania:** 6 gigantycznych pól na kod PIN od Opiekuna. Automatycznie wysuwana klawiatura numeryczna.
* **Ekran Główny:** * Duży zegar odliczający czas do następnego leku.
  * **GIGANTYCZNY PRZYCISK (80% ekranu)**. Kiedy jest pora na lek, staje się aktywny i wyraźny. [cite_start]Jego kliknięcie aktualizuje historię w aplikacji opiekuna i wyłącza alarmy[cite: 68].
  * Na dole dwa małe przyciski: Harmonogram (prosta lista z odhaczonymi lekami) i Ustawienia.

### Panel Seniora (Samodzielnego)
* **Ekran Główny (Hybryda):** Posiada gigantyczny przycisk do odznaczania bieżącego leku, ale poniżej wyświetla się bezpośrednio harmonogram z możliwością dodania nowego leku (standardowy Google FAB `+`).