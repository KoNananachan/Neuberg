import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxReserves() {
  return useQuery({
    queryKey: ['fx-reserves'],
    queryFn: () => api.get<any>('/fx-reserves'),
    staleTime: 180000,
  });
}
