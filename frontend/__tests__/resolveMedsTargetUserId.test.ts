import {
  isUserUuid,
  normalizeRouteParam,
  resolveMedsTargetUserId,
  pickDependentUserId,
} from '../utils/resolveMedsTargetUserId';

const DEP_ID = 'a1b2c3d4-e5f6-4178-9abc-def012345678';

describe('resolveMedsTargetUserId', () => {
  it('isUserUuid validates UUID v4 shape', () => {
    expect(isUserUuid(DEP_ID)).toBe(true);
    expect(isUserUuid('not-uuid')).toBe(false);
  });

  it('normalizeRouteParam handles array', () => {
    expect(normalizeRouteParam([DEP_ID])).toBe(DEP_ID);
    expect(normalizeRouteParam('  ')).toBeNull();
  });

  it('reads id from dependent segment', () => {
    const id = resolveMedsTargetUserId({}, ['(caretaker)', 'dependent', DEP_ID, 'treatments']);
    expect(id).toBe(DEP_ID);
  });

  it('prefers dependentId param', () => {
    const other = 'b2c3d4e5-f6a7-4890-abcd-ef0123456789';
    const id = resolveMedsTargetUserId(
      { dependentId: other },
      ['(caretaker)', 'dependent', DEP_ID],
    );
    expect(id).toBe(other);
  });

  it('pickDependentUserId prefers context user id', () => {
    const id = pickDependentUserId({
      contextUserId: DEP_ID,
      segments: [],
      globalId: 'b2c3d4e5-f6a7-4890-abcd-ef0123456789',
    });
    expect(id).toBe(DEP_ID);
  });
});
