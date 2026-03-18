import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMacroSurpriseTracker() {
  return useQuery({
    queryKey: ['macro-surprise-tracker'],
    queryFn: () => api.get<any>('/macro-surprise-tracker'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
