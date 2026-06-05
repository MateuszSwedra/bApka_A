import pl from '../i18n/locales/pl.json';
import en from '../i18n/locales/en.json';
import type { TreatmentType } from '../constants/treatmentVisuals';

const TREATMENT_TYPE_ORDER: TreatmentType[] = [
  'MEDICATION',
  'BLOOD_SUGAR',
  'BLOOD_PRESSURE',
  'EXERCISE',
  'CUSTOM',
];
import type { ScheduleItem, Treatment } from '../context/MedsContext';

function treatmentIdForSchedule(sch: ScheduleItem): string | undefined {
  return sch.treatmentId ?? sch.inventoryId;
}

const TYPE_I18N_KEY: Record<TreatmentType, string> = {
  MEDICATION: 'medication',
  BLOOD_SUGAR: 'bloodSugar',
  BLOOD_PRESSURE: 'bloodPressure',
  EXERCISE: 'exercise',
  CUSTOM: 'custom',
};

type TreatmentTypeBlock = { defaultName: string; label: string };

function readTypeBlock(locale: typeof pl | typeof en, typeKey: string): TreatmentTypeBlock {
  const block = locale.treatment.type[typeKey as keyof typeof locale.treatment.type];
  return block as TreatmentTypeBlock;
}

function formatDosagePieces(count: string): string {
  return pl.schedule.dosagePieces.replace('{{count}}', count);
}

/** Znane nazwy domyślne / etykiety typów (PL i EN) → typ aktywności. */
function buildKnownNameIndex(): Map<string, TreatmentType> {
  const index = new Map<string, TreatmentType>();
  const add = (label: string, type: TreatmentType) => {
    const key = label.trim().toLowerCase();
    if (key) index.set(key, type);
  };

  for (const type of TREATMENT_TYPE_ORDER) {
    const typeKey = TYPE_I18N_KEY[type];
    const plBlock = readTypeBlock(pl, typeKey);
    const enBlock = readTypeBlock(en, typeKey);
    add(plBlock.defaultName, type);
    add(enBlock.defaultName, type);
    add(plBlock.label, type);
    add(enBlock.label, type);
    const plGroup = pl.treatment.group[typeKey as keyof typeof pl.treatment.group];
    const enGroup = en.treatment.group[typeKey as keyof typeof en.treatment.group];
    if (plGroup) add(plGroup, type);
    if (enGroup) add(enGroup, type);
  }

  return index;
}

const KNOWN_NAME_TO_TYPE = buildKnownNameIndex();

export function polishDefaultNameForType(type: TreatmentType): string {
  const key = TYPE_I18N_KEY[type];
  return readTypeBlock(pl, key).defaultName;
}

/** Etykieta aktywności dla seniora — zawsze po polsku (także gdy opiekun dodał po angielsku). */
export function resolveSeniorActivityName(
  sch: ScheduleItem,
  treatment?: Treatment | null,
): string {
  const rawName = sch.customName?.trim() || treatment?.name?.trim() || '';
  let name: string;

  if (!rawName) {
    name = pl.schedule.activityFallback;
  } else if (KNOWN_NAME_TO_TYPE.has(rawName.trim().toLowerCase())) {
    const type = KNOWN_NAME_TO_TYPE.get(rawName.trim().toLowerCase())!;
    name = polishDefaultNameForType(type);
  } else {
    name = rawName;
  }

  if (sch.dosage && sch.dosage !== '1') {
    name += formatDosagePieces(sch.dosage);
  }

  return name;
}

export function seniorActivityNameForSchedule(
  sch: ScheduleItem,
  treatments: Treatment[],
): string {
  const tid = treatmentIdForSchedule(sch);
  const treatment = tid ? treatments.find(tr => tr.id === tid) : undefined;
  return resolveSeniorActivityName(sch, treatment);
}

export function seniorScheduleTypeLabel(sch: ScheduleItem): string {
  if (sch.type === 'ONCE') return pl.schedule.type.once;
  if (sch.type === 'REGULAR') return pl.schedule.type.regular;
  return pl.schedule.type.temporary;
}
