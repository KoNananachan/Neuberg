import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFiscalDeficit() {
  return useQuery({
    queryKey: ['fiscal-deficit'],
    queryFn: () => api.get<any>('/fiscal-deficit'),
    staleTime: 60 * 60 * 1000,
  });
}
