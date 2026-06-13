import { useMeds } from '../context/MedsContext';

/** UUID zalogowanego seniora samodzielnego (HYBRID) - z kontekstu leków. */
export function useSelfUserId(): string | null {
  const { targetUserId } = useMeds();
  return targetUserId;
}
