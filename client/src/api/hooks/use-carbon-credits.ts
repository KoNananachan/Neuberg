import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCarbonCredits() {
  return useQuery({
    queryKey: ['carbon-credits'],
    queryFn: () => api.get<any>('/carbon-credits'),
    staleTime: 60 * 60 * 1000,
  });
}
