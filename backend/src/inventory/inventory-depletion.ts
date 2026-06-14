type ScheduleLike = {
  type: string;
  dosage: string;
  daysOfWeek?: number[];
};

export type InventoryDepletion = {
  daysLeft: number;
  pillsLeft: number;
};

export function isMedicationInventory(type?: string | null): boolean {
  return (type ?? 'MEDICATION') === 'MEDICATION';
}

export function parseDosagePills(dosage?: string | null): number {
  if (!dosage?.trim()) return 1;
  const n = parseInt(dosage.replace(/[^0-9]/g, ''), 10);
  if (!n || n <= 0) return 1;
  return n;
}

export function calculateInventoryDepletion(
  inventory: {
    currentPills?: number | null;
    totalPills?: number | null;
    schedules: ScheduleLike[];
  },
): InventoryDepletion {
  const pillsLeft = inventory.currentPills ?? inventory.totalPills ?? 0;
  const recurring = inventory.schedules.filter((s) => s.type !== 'ONCE');

  if (recurring.length === 0) {
    return { daysLeft: 999, pillsLeft };
  }

  let pillsPerWeek = 0;
  for (const s of recurring) {
    const pills = parseDosagePills(s.dosage);
    const days =
      s.daysOfWeek && s.daysOfWeek.length > 0
        ? s.daysOfWeek.length
        : s.type === 'TEMPORARY'
          ? 7
          : 0;
    pillsPerWeek += pills * days;
  }

  if (pillsPerWeek <= 0) {
    return { daysLeft: 999, pillsLeft };
  }

  const pillsPerDay = pillsPerWeek / 7;
  const daysLeft =
    pillsPerDay > 0 ? Math.floor(pillsLeft / pillsPerDay) : 999;

  return { daysLeft, pillsLeft };
}
