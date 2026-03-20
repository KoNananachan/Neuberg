import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxOptionVolMatrix() {
  return useQuery({
    queryKey: ['fx-option-vol-matrix'],
    queryFn: () => api.get<any>('/fx-option-vol-matrix'),
    staleTime: 180000,
  });
}
