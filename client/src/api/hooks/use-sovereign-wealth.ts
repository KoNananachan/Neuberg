import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSovereignWealth() {
  return useQuery({
    queryKey: ['sovereign-wealth'],
    queryFn: () => api.get<any>('/sovereign-wealth'),
    staleTime: 60 * 60 * 1000,
  });
}
