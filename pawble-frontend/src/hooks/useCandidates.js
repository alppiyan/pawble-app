import { useCallback, useEffect, useState } from 'react';
import { matchApi } from '../api/matchApi.js';

export function useCandidates({ mode, myPetId, filters = {} }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!myPetId) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await matchApi.candidates({ mode, myPetId, ...filters });
      setCandidates(data);
    } catch (e) {
      console.error(e);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [mode, myPetId, JSON.stringify(filters)]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { candidates, loading, refetch, setCandidates };
}
