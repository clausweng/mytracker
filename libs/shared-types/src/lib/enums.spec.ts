import { AuthProvider, ExerciseStatus, StatsPeriod, SyncEntryStatus } from './enums.js';

describe('shared-types enums', () => {
  it('exposes the expected ExerciseStatus values', () => {
    expect(Object.values(ExerciseStatus)).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });

  it('exposes the expected AuthProvider values', () => {
    expect(Object.values(AuthProvider)).toEqual(['GOOGLE', 'FACEBOOK']);
  });

  it('exposes the expected StatsPeriod values', () => {
    expect(Object.values(StatsPeriod)).toEqual(['WEEK', 'MONTH', 'YEAR', 'SINCE']);
  });

  it('exposes the expected SyncEntryStatus values', () => {
    expect(Object.values(SyncEntryStatus)).toEqual(['CREATED', 'UPDATED', 'IGNORED']);
  });
});
