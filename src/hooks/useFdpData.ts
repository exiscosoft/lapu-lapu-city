import { useEffect, useState } from 'react';
import type {
  BidRow,
  BudgetEntry,
  Catalog,
  Dataset,
  DebtEntry,
  Funds,
  SreEntry,
  WorkforceEntry,
} from '../types/fdp';

export interface FdpDatasets {
  catalog: Catalog;
  finances: SreEntry[];
  funds: Funds;
  procurement: BidRow[];
  workforce: WorkforceEntry[];
  debt: DebtEntry[];
  budget: BudgetEntry[];
}

const cache = new Map<string, Promise<unknown>>();

/** Fetches a file from public/data/fdp/, once per page load. */
export function fetchFdp<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    const request = fetch(`/data/fdp/${file}`).then(res => {
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
      return res.json();
    });
    request.catch(() => cache.delete(file));
    cache.set(file, request);
  }
  return cache.get(file) as Promise<T>;
}

export function fetchFdpText(file: string): Promise<string> {
  const key = `text:${file}`;
  if (!cache.has(key)) {
    const request = fetch(`/data/fdp/${file}`).then(res => {
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
      return res.text();
    });
    request.catch(() => cache.delete(key));
    cache.set(key, request);
  }
  return cache.get(key) as Promise<string>;
}

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAsync<T>(load: () => Promise<T>, key: string): State<T> {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let active = true;
    setState(s => ({ ...s, loading: true, error: null }));
    load()
      .then(data => active && setState({ data, loading: false, error: null }))
      .catch(
        (err: Error) =>
          active && setState({ data: null, loading: false, error: err.message })
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** Loads every dashboard dataset (all small; budget line items load lazily). */
export function useFdpData(): State<FdpDatasets> {
  return useAsync(async () => {
    const files = [
      'catalog',
      'finances',
      'funds',
      'procurement',
      'workforce',
      'debt',
      'budget',
    ] as const;
    const results = await Promise.all(
      files.map(f => fetchFdp<Dataset<unknown>>(`${f}.json`))
    );
    return Object.fromEntries(
      files.map((f, i) => [f, results[i].data])
    ) as unknown as FdpDatasets;
  }, 'all');
}

/** Loads one generated JSON file (e.g. `docs/{id}.json`), or nothing. */
export function useFdpJson<T>(file: string | null): State<T> {
  return useAsync(
    () => (file ? fetchFdp<T>(file) : Promise.resolve(null as T)),
    file || ''
  );
}

export function useFdpText(file: string | null): State<string> {
  return useAsync(
    () => (file ? fetchFdpText(file) : Promise.resolve('')),
    file || ''
  );
}
