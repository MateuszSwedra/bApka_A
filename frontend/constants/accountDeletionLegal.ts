export type LegalLocale = 'pl' | 'en';

export const ACCOUNT_DELETION_DOCS: Record<
  LegalLocale,
  { title: string; body: string }
> = {
  pl: {
    title: 'Usuwanie konta i danych',
    body: `Data wejścia w życie: 29.10.2026

1. Jak usunąć konto w aplikacji
Każdy zalogowany użytkownik może złożyć żądanie usunięcia własnego konta w aplikacji bApka:
- Opiekun: Ustawienia → „Usuń moje konto” (wymaga wpisania potwierdzenia: usun).
- Senior (podopieczny): ikona informacji obok wylogowania → „Usuń moje konto” (wpisz: usun moje konto).
- Opiekun może także usunąć konto sparowanego seniora (Ustawienia → „Usuń konto seniora”) albo tylko rozłączyć parowanie (przycisk przy profilu seniora), bez kasowania konta seniora.

2. Co się dzieje po potwierdzeniu
Po poprawnym potwierdzeniu frazą konto jest usuwane z systemu. Usuwamy dane konta (e-mail, hasło/identyfikator Google, profil), powiązania opiekun–senior oraz dane opieki powiązane z tym kontem (m.in. leki, harmonogramy, logi dawek, nastrój, pomiary, zdarzenia SOS), o ile nie są już potrzebne do obsługi innego aktywnego konta.

3. Termin realizacji
Zazwyczaj usunięcie następuje od razu po potwierdzeniu w aplikacji. W każdym przypadku zakończymy usuwanie danych konta najpóźniej w ciągu 30 dni od żądania. Po upływie tego terminu czynność jest nieodwracalna — nie da się przywrócić usuniętego konta ani powiązanych danych opieki.

4. Rozłączenie bez usuwania
Opiekun może trwale rozłączyć parowanie z seniorem (wpisz: rozlacz). Oba konta pozostają, ale opiekun traci dostęp do danych opieki tego seniora, dopóki nie sparujecie się ponownie.

5. Kontakt
Pytania dotyczące usuwania danych: danpas@st.amu.edu.pl`,
  },
  en: {
    title: 'Account and data deletion',
    body: `Effective date: 29 Oct 2026

1. How to delete your account in the app
Every signed-in user can request deletion of their own bApka account:
- Caretaker: Settings → “Delete my account” (type confirmation: delete).
- Senior (dependent): info icon next to log out → “Delete my account” (type: delete my account).
- A caretaker may also delete a paired senior’s account (Settings → “Delete senior account”) or only unpair (button on the senior’s card) without deleting the senior’s account.

2. What happens after confirmation
After you confirm with the required phrase, the account is removed. We delete account data (email, password/Google id, profile), caretaker–senior links, and care data tied to that account (including medications, schedules, dose logs, mood, vitals, SOS events), unless still required for another active account.

3. Timeframe
Deletion usually happens immediately after in-app confirmation. In all cases we complete account data deletion within 30 days of the request. After that period the action is irreversible — the account and related care data cannot be restored.

4. Unpairing without deletion
A caretaker can permanently unpair from a senior (type: disconnect). Both accounts remain, but the caretaker loses access to that senior’s care data until you pair again.

5. Contact
Questions about data deletion: danpas@st.amu.edu.pl`,
  },
};
