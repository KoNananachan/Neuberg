import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEarningsWhisper() {
  return useQuery({
    queryKey: ['earnings-whisper'],
    queryFn: () => api.get<any>('/earnings-whisper'),
    staleTime: 60 * 60 * 1000,
  });
}
