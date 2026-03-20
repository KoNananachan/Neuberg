import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMunicipalCredit() {
  return useQuery({
    queryKey: ['municipal-credit'],
    queryFn: () => api.get<any>('/municipal-credit'),
    staleTime: 60 * 60 * 1000,
  });
}
