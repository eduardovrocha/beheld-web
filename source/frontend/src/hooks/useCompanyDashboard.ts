/**
 * Loads the three company-side endpoints in parallel and exposes the
 * resulting state + the mutations (save / update note / remove). 401 from
 * any endpoint short-circuits to `auth_required`.
 */
import { useEffect, useState } from "react";

import {
  getDashboard,
  getMessages,
  getSavedDevs,
  saveDev as apiSaveDev,
  updateSavedDevNote as apiUpdateNote,
  removeSavedDev as apiRemoveSaved,
  CompanyAuthError,
  type DashboardStats,
  type ActivityEvent,
  type CompanyMessage,
  type SavedDev,
} from "@/lib/companyDashboardApi";

export interface CompanyDashboardState {
  stats:           DashboardStats | null;
  recentActivity:  ActivityEvent[];
  messages:        CompanyMessage[];
  savedDevs:       SavedDev[];
  loading:         boolean;
  error:           string | null;
  authRequired:    boolean;

  saveDev:         (accountId: number, note?: string) => Promise<void>;
  updateNote:      (accountId: number, note: string)  => Promise<void>;
  removeSavedDev:  (accountId: number)                => Promise<void>;
}

export function useCompanyDashboard(): CompanyDashboardState {
  const [stats, setStats]                     = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity]   = useState<ActivityEvent[]>([]);
  const [messages, setMessages]               = useState<CompanyMessage[]>([]);
  const [savedDevs, setSavedDevs]             = useState<SavedDev[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [authRequired, setAuthRequired]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashboard, msgs, saved] = await Promise.all([
          getDashboard(),
          getMessages(),
          getSavedDevs(),
        ]);
        if (cancelled) return;
        setStats(dashboard.stats);
        setRecentActivity(dashboard.recent_activity);
        setMessages(msgs);
        setSavedDevs(saved);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof CompanyAuthError) setAuthRequired(true);
        else                                setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveDev(accountId: number, note?: string): Promise<void> {
    try {
      await apiSaveDev(accountId, note ?? null);
      const updated = await getSavedDevs();
      setSavedDevs(updated);
    } catch (e) {
      if (e instanceof CompanyAuthError) setAuthRequired(true);
      else                                setError((e as Error).message);
    }
  }

  async function updateNote(accountId: number, note: string): Promise<void> {
    try {
      const { saved_dev } = await apiUpdateNote(accountId, note);
      setSavedDevs((prev) => prev.map((s) => s.account_id === accountId ? saved_dev : s));
    } catch (e) {
      if (e instanceof CompanyAuthError) setAuthRequired(true);
      else                                setError((e as Error).message);
    }
  }

  async function removeSavedDev(accountId: number): Promise<void> {
    try {
      await apiRemoveSaved(accountId);
      setSavedDevs((prev) => prev.filter((s) => s.account_id !== accountId));
    } catch (e) {
      if (e instanceof CompanyAuthError) setAuthRequired(true);
      else                                setError((e as Error).message);
    }
  }

  return {
    stats, recentActivity, messages, savedDevs,
    loading, error, authRequired,
    saveDev, updateNote, removeSavedDev,
  };
}
