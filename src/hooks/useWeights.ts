import { useCallback, useEffect, useState } from 'react';
import { weightRepository } from '@/infrastructure/storage/weightRepository';
import type { Weight } from '@/types/domain';

const EVT = 'meal-tracker:weights-updated';

export function notifyWeightsUpdated() {
  window.dispatchEvent(new Event(EVT));
}

export function useWeights() {
  const [weights, setWeights] = useState<Weight[]>(() => weightRepository.findAll());

  const reload = useCallback(() => setWeights(weightRepository.findAll()), []);

  useEffect(() => {
    window.addEventListener(EVT, reload);
    return () => window.removeEventListener(EVT, reload);
  }, [reload]);

  const saveWeight = useCallback((weight: Weight) => {
    weightRepository.save(weight);
    notifyWeightsUpdated();
  }, []);

  const deleteWeight = useCallback((id: string) => {
    weightRepository.delete(id);
    notifyWeightsUpdated();
  }, []);

  return { weights, saveWeight, deleteWeight, reload };
}
