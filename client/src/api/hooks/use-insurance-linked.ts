import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useInsuranceLinked() {
  return useQuery({
    queryKey: ['insurance-linked'],
    queryFn: () => api.get<any>('/insurance-linked'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
