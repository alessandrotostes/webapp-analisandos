import { useState, useEffect, useCallback } from 'react';
import { getInvoices, type GetInvoicesParams } from '../services/firebase/firestoreService';
import type { Invoice } from '../types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export function useInvoices(initialParams: Omit<GetInvoicesParams, 'lastVisible'> = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [params, setParams] = useState<Omit<GetInvoicesParams, 'lastVisible'>>(initialParams);

  const fetchInvoices = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const fetchParams: GetInvoicesParams = {
        ...params,
        lastVisible: isLoadMore ? (lastDoc || undefined) : undefined,
      };

      const result = await getInvoices(fetchParams);

      if (isLoadMore) {
        setInvoices((prev) => [...prev, ...result.data]);
      } else {
        setInvoices(result.data);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.data.length === (params.pageSize || 20));
    } catch (err: any) {
      console.error("Erro ao buscar faturas do Firestore:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [params, lastDoc]);

  // Busca inicial ao alterar filtros
  useEffect(() => {
    fetchInvoices(false);
  }, [params]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchInvoices(true);
    }
  }, [loading, hasMore, fetchInvoices]);

  const updateFilters = useCallback((newParams: Partial<Omit<GetInvoicesParams, 'lastVisible'>>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const refetch = useCallback(() => {
    fetchInvoices(false);
  }, [fetchInvoices]);

  return {
    invoices,
    loading,
    error,
    hasMore,
    loadMore,
    updateFilters,
    refetch,
    filters: params,
  };
}
