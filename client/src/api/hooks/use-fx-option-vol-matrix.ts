import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxOptionVolMatrix() {
  return useQuery({
    queryKey: ['fx-option-vol-matrix'],
    queryFn: () => api.get<any>('/fx-option-vol-matrix'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
