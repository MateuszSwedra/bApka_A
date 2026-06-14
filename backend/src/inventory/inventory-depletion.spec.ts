import { calculateInventoryDepletion, isMedicationInventory, parseDosagePills } from './inventory-depletion';

describe('inventory-depletion', () => {
  it('isMedicationInventory is true only for medications', () => {
    expect(isMedicationInventory('MEDICATION')).toBe(true);
    expect(isMedicationInventory(null)).toBe(true);
    expect(isMedicationInventory('BLOOD_SUGAR')).toBe(false);
    expect(isMedicationInventory('BLOOD_PRESSURE')).toBe(false);
  });
  it('parseDosagePills extracts count from dosage string', () => {
    expect(parseDosagePills('2 tabletki')).toBe(2);
    expect(parseDosagePills('')).toBe(1);
  });

  it('returns high daysLeft when no recurring schedules', () => {
    expect(
      calculateInventoryDepletion({
        currentPills: 10,
        totalPills: 10,
        schedules: [{ type: 'ONCE', dosage: '1', daysOfWeek: [] }],
      }),
    ).toEqual({ daysLeft: 999, pillsLeft: 10 });
  });

  it('calculates days left from weekly usage', () => {
    expect(
      calculateInventoryDepletion({
        currentPills: 14,
        totalPills: 14,
        schedules: [
          { type: 'DAILY', dosage: '1', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] },
        ],
      }),
    ).toEqual({ daysLeft: 14, pillsLeft: 14 });
  });
});
