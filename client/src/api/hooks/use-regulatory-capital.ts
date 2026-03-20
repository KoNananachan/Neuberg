import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRegulatoryCapital() {
  return useQuery({
    queryKey: ['regulatory-capital'],
    queryFn: () => api.get<any>('/regulatory-capital'),
    staleTime: 60 * 60 * 1000,
  });
}
