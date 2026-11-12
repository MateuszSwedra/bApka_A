import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { usersAPI } from './api';
import {
  hasCompletedRoleSelection,
  resolvePostAuthRoute,
  type MeProfile,
} from './postAuthRouting';
import { clearGoogleAuthPending } from '../utils/googleWebRedirect';
import { applyAppLanguage, getStoredAppLanguage } from './appLanguage';
import { resolveDeviceLanguage } from '../i18n/resolveLanguage';

type AuthUser = {
  role?: string | null;
  name?: string | null;
  roleSelected?: boolean | null;
};

async function setNeedsDisplayName(needed: boolean) {
  if (Platform.OS === 'web') {
    if (needed) localStorage.setItem('needsDisplayName', 'true');
    else localStorage.removeItem('needsDisplayName');
    return;
  }
  if (needed) await SecureStore.setItemAsync('needsDisplayName', 'true');
  else await SecureStore.deleteItemAsync('needsDisplayName');
}

async function persistTokenWithoutRole(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('userToken', token);
    localStorage.removeItem('userRole');
    return;
  }
  await SecureStore.setItemAsync('userToken', token);
  try {
    await SecureStore.deleteItemAsync('userRole');
  } catch {
  }
}

async function seedNewAccountLanguage(): Promise<void> {
  try {
    const stored = await getStoredAppLanguage();
    const lang = stored ?? resolveDeviceLanguage(Localization.getLocales());
    await applyAppLanguage(lang);
    await usersAPI.updateSettings({ appLanguage: lang });
  } catch {
    // Język lokalny i tak jest już ustawiony; API może być niedostępne.
  }
}

export async function finishAuthSession(options: {
  accessToken: string;
  user: AuthUser;
  setUserSession: (token: string, role: 'CARETAKER' | 'DEPENDENT' | 'HYBRID' | null) => Promise<void>;
  /** Nowe konto: zapisz język systemu (lub PL) w profilu. */
  seedAppLanguage?: boolean;
}): Promise<void> {
  const { accessToken, user, setUserSession, seedAppLanguage } = options;

  await persistTokenWithoutRole(accessToken);

  if (seedAppLanguage) {
    await seedNewAccountLanguage();
  }

  const needsName = !user?.name?.trim();
  await setNeedsDisplayName(needsName);

  const fromLogin: MeProfile = {
    role: user?.role,
    name: user?.name,
    roleSelected: user?.roleSelected,
  };

  try {
    if (!hasCompletedRoleSelection(fromLogin)) {
      router.replace(needsName ? '/onboarding-name' : '/role-selection');
      return;
    }

    let profile = fromLogin;
    try {
      const me = (await usersAPI.getMe()) as MeProfile;
      profile = {
        role: me.role ?? fromLogin.role,
        name: me.name ?? fromLogin.name,
        roleSelected: me.roleSelected ?? fromLogin.roleSelected,
        isPairedWithCaretaker: me.isPairedWithCaretaker,
        hasPushToken: me.hasPushToken,
      };
    } catch {
    }

    const role = profile.role;
    if (role === 'CARETAKER' || role === 'DEPENDENT' || role === 'HYBRID') {
      await setUserSession(accessToken, role);
    }

    if (needsName || !profile.name?.trim()) {
      await setNeedsDisplayName(true);
      router.replace('/onboarding-name');
      return;
    }

    const destination = await resolvePostAuthRoute(profile, {
      needsDisplayName: false,
      storedRole: role ?? null,
    });
    router.replace(destination as Parameters<typeof router.replace>[0]);
  } finally {
    clearGoogleAuthPending();
  }
}
