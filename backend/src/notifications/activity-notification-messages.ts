export type ActivityKind = 'medication' | 'measurement' | 'activity';

export type NotificationLang = 'pl' | 'en';

export function activityKindFromInventoryType(type?: string | null): ActivityKind {
  if (!type || type === 'MEDICATION') return 'medication';
  if (type === 'BLOOD_SUGAR' || type === 'BLOOD_PRESSURE') return 'measurement';
  return 'activity';
}

type Msg = { title: string; body: string };

function completedMsg(
  kind: ActivityKind,
  lang: NotificationLang,
  dependentName: string,
  activityName: string,
  late: boolean,
): Msg {
  const name = activityName || (lang === 'en' ? 'activity' : 'aktywność');

  if (lang === 'en') {
    if (kind === 'medication') {
      return late
        ? {
            title: 'Medicine taken late',
            body: `${dependentName} took late: ${name}`,
          }
        : {
            title: 'Medicine taken',
            body: `${dependentName} took: ${name}`,
          };
    }
    if (kind === 'measurement') {
      return late
        ? {
            title: 'Reading recorded late',
            body: `${dependentName} completed late: ${name}`,
          }
        : {
            title: 'Reading recorded',
            body: `${dependentName} completed: ${name}`,
          };
    }
    return late
      ? {
          title: 'Activity completed late',
          body: `${dependentName} completed late: ${name}`,
        }
      : {
          title: 'Activity completed',
          body: `${dependentName} completed: ${name}`,
        };
  }

  if (kind === 'medication') {
    return late
      ? {
          title: 'Lek przyjęty spóźnionie',
          body: `${dependentName} przyjął(a) spóźnionie: ${name}`,
        }
      : {
          title: 'Lek przyjęty',
          body: `${dependentName} przyjął(a): ${name}`,
        };
  }
  if (kind === 'measurement') {
    return late
      ? {
          title: 'Pomiar wykonany spóźnionie',
          body: `${dependentName} wykonał(a) spóźnionie pomiar: ${name}`,
        }
      : {
          title: 'Pomiar wykonany',
          body: `${dependentName} wykonał(a) pomiar: ${name}`,
        };
  }
  return late
    ? {
        title: 'Aktywność wykonana spóźnionie',
        body: `${dependentName} wykonał(a) spóźnionie: ${name}`,
      }
    : {
        title: 'Aktywność wykonana',
        body: `${dependentName} wykonał(a): ${name}`,
      };
}

function missedMsg(
  kind: ActivityKind,
  lang: NotificationLang,
  dependentName: string,
  activityName: string,
): Msg {
  const name = activityName || (lang === 'en' ? 'activity' : 'aktywność');

  if (lang === 'en') {
    if (kind === 'medication') {
      return {
        title: 'Missed medicine',
        body: `${dependentName} did not take: ${name}`,
      };
    }
    if (kind === 'measurement') {
      return {
        title: 'Missed reading',
        body: `${dependentName} did not complete: ${name}`,
      };
    }
    return {
      title: 'Missed activity',
      body: `${dependentName} did not complete: ${name}`,
    };
  }

  if (kind === 'medication') {
    return {
      title: 'Pominięty lek',
      body: `${dependentName} nie przyjął(a): ${name}`,
    };
  }
  if (kind === 'measurement') {
    return {
      title: 'Pominięty pomiar',
      body: `${dependentName} nie wykonał(a) pomiaru: ${name}`,
    };
  }
  return {
    title: 'Pominięta aktywność',
    body: `${dependentName} nie wykonał(a): ${name}`,
  };
}

function seniorMissedMsg(kind: ActivityKind, lang: NotificationLang, activityName: string): Msg {
  const name = activityName || (lang === 'en' ? 'activity' : 'aktywność');

  if (lang === 'en') {
    if (kind === 'medication') {
      return {
        title: 'Missed medicine',
        body: `You did not confirm taking: ${name}`,
      };
    }
    if (kind === 'measurement') {
      return {
        title: 'Missed reading',
        body: `You did not confirm: ${name}`,
      };
    }
    return {
      title: 'Missed activity',
      body: `You did not confirm: ${name}`,
    };
  }

  if (kind === 'medication') {
    return {
      title: 'Pominięty lek',
      body: `Nie potwierdziłeś/aś przyjęcia: ${name}`,
    };
  }
  if (kind === 'measurement') {
    return {
      title: 'Pominięty pomiar',
      body: `Nie potwierdziłeś/aś pomiaru: ${name}`,
    };
  }
  return {
    title: 'Pominięta aktywność',
    body: `Nie potwierdziłeś/aś wykonania: ${name}`,
  };
}

export function buildCompletionNotification(
  kind: ActivityKind,
  dependentName: string,
  activityName: string,
  late: boolean,
  lang: NotificationLang = 'pl',
): Msg {
  return completedMsg(kind, lang, dependentName, activityName, late);
}

export function buildMissedCaretakerNotification(
  kind: ActivityKind,
  dependentName: string,
  activityName: string,
  lang: NotificationLang = 'pl',
): Msg {
  return missedMsg(kind, lang, dependentName, activityName);
}

export function buildMissedSeniorNotification(
  kind: ActivityKind,
  activityName: string,
  lang: NotificationLang = 'pl',
): Msg {
  return seniorMissedMsg(kind, lang, activityName);
}
