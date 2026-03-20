import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxCarry() {
  return useQuery({
    queryKey: ['fx-carry'],
    queryFn: () => api.get<any>('/fx-carry'),
    staleTime: 60 * 60 * 1000,
  });
}
