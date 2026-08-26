"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_ACCOUNTS_SYNC_EVENT,
  loadHostAccounts,
  saveHostAccounts,
} from "./host-accounts-data";
import type { HostAccountsData, HostPayoutAccountInput } from "./host-accounts-types";
import {
  fetchHostAccountsFromApi,
  savePayoutAccountViaApi,
  shouldUseSharedHostAccounts,
} from "./host-accounts-api";

export function useHostAccounts(hostId: string | undefined) {
  const [data, setData] = useState<HostAccountsData | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostAccounts();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }
    try {
      setData(await fetchHostAccountsFromApi(hostId));
      setReady(true);
      return;
    } catch {
      if (!shared) {
        setData(loadHostAccounts(hostId));
        setReady(true);
        return;
      }
    }
    setData(loadHostAccounts(hostId));
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-accounts") void refresh();
    }
    window.addEventListener(HOST_ACCOUNTS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_ACCOUNTS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function saveAccount(input: HostPayoutAccountInput) {
    if (!hostId) return null;
    try {
      const next = await savePayoutAccountViaApi(hostId, input);
      setData(next);
      window.dispatchEvent(new Event(HOST_ACCOUNTS_SYNC_EVENT));
      return next;
    } catch (error) {
      if (shared) throw error;
    }
    if (!data) return null;
    const next: HostAccountsData = {
      ...data,
      payoutAccount: {
        method: input.method,
        accountHolder: input.accountHolder.trim(),
        bankName: input.bankName?.trim() || undefined,
        accountNumber: input.accountNumber?.trim() || undefined,
        iban: input.iban?.trim() || undefined,
        swift: input.swift?.trim() || undefined,
        upiId: input.upiId?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
    };
    saveHostAccounts(next);
    setData(next);
    return next;
  }

  return { ready, data, refresh, saveAccount };
}
