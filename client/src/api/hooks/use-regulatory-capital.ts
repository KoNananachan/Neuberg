import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRegulatoryCapital() {
  return useQuery({
    queryKey: ['regulatory-capital'],
    queryFn: () => api.get<any>('/regulatory-capital'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
