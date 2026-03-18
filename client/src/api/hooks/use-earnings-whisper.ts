import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEarningsWhisper() {
  return useQuery({
    queryKey: ['earnings-whisper'],
    queryFn: () => api.get<any>('/earnings-whisper'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
