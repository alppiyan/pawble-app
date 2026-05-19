import { useEffect, useState } from 'react';
import { metadataApi } from '../api/metadataApi.js';

let cache = null;
let pending = null;

export function useMetadata() {
  const [data, setData] = useState(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    pending = pending || metadataApi.getAll();
    pending
      .then((d) => {
        cache = d;
        setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  return { species: data?.species || [], breeds: data?.breeds || [], loading };
}
