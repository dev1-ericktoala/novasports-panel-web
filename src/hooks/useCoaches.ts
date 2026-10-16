import { useQuery } from '@tanstack/react-query';
import { coachesApi } from '@/api/endpoints';

export function useCoachesPendingCounts() {
  return useQuery({
    queryKey: ['coaches-pending'],
    queryFn: coachesApi.pendingCounts,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
