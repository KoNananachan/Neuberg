import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSecuritization() {
  return useQuery({
    queryKey: ['securitization'],
    queryFn: () => api.get<any>('/securitization'),
    staleTime: 60 * 60 * 1000,
  });
}
