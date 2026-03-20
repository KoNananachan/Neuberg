import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCountryRisk() {
  return useQuery({
    queryKey: ['country-risk'],
    queryFn: () => api.get<any>('/country-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
