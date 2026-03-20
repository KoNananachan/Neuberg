import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMacroRisk() {
  return useQuery({
    queryKey: ['macro-risk'],
    queryFn: () => api.get<any>('/macro-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
