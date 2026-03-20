import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAlternativeData() {
  return useQuery({
    queryKey: ['alternative-data'],
    queryFn: () => api.get<any>('/alternative-data'),
    staleTime: 60 * 60 * 1000,
  });
}
