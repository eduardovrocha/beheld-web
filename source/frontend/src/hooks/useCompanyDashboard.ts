/**
 * Loads the four company-side endpoints in parallel (dashboard stats +
 * messages + saved devs + positions) and exposes the resulting state +
 * the mutations. 401 from any endpoint short-circuits to `auth_required`.
 */
import { useEffect, useState } from "react";

import {
  getDashboard,
  getMessages,
  getSavedDevs,
  getPositions,
  saveDev as apiSaveDev,
  updateSavedDevNote as apiUpdateNote,
  removeSavedDev as apiRemoveSaved,
  createPosition as apiCreatePosition,
  updatePosition as apiUpdatePosition,
  archivePosition as apiArchivePosition,
  reactivatePosition as apiReactivatePosition,
  CompanyAuthError,
  type DashboardStats,
  type ActivityEvent,
  type CompanyMessage,
  type SavedDev,
  type Position,
  type PositionInput,
} from "@/lib/companyDashboardApi";

export interface CompanyDashboardState {
  stats:           DashboardStats | null;
  recentActivity:  ActivityEvent[];
  messages:        CompanyMessage[];
  savedDevs:       SavedDev[];
  positions:       Position[];
  loading:         boolean;
  error:           string | null;
  authRequired:    boolean;

  saveDev:         (accountId: number, note?: string) => Promise<void>;
  updateNote:      (accountId: number, note: string)  => Promise<void>;
  removeSavedDev:  (accountId: number)                => Promise<void>;

  createPosition:  (input: PositionInput) => Promise<void>;
  updatePosition:  (id: number, input: Partial<PositionInput>) => Promise<void>;
  archivePosition:    (id: number) => Promise<void>;
  reactivatePosition: (id: number) => Promise<void>;
}

export function useCompanyDashboard(): CompanyDashboardState {
  const [stats, setStats]                     = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity]   = useState<ActivityEvent[]>([]);
  const [messages, setMessages]               = useState<CompanyMessage[]>([]);
  const [savedDevs, setSavedDevs]             = useState<SavedDev[]>([]);
  const [positions, setPositions]             = useState<Position[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [authRequired, setAuthRequired]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashboard, msgs, saved, pos] = await Promise.all([
          getDashboard(),
          getMessages(),
          getSavedDevs(),
          getPositions(),
        ]);
        if (cancelled) return;
        setStats(dashboard.stats);
        setRecentActivity(dashboard.recent_activity);
        setMessages(msgs);
        setSavedDevs(saved);
        setPositions(pos);
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

  async function createPosition(input: PositionInput): Promise<void> {
    try {
      const { position } = await apiCreatePosition(input);
      setPositions((prev) => [position, ...prev]);
    } catch (e) {
      if (e instanceof CompanyAuthError) setAuthRequired(true);
      else                                setError((e as Error).message);
    }
  }

  async function updatePosition(
    id: number,
    input: Partial<PositionInput>,
  ): Promise<void> {
    try {
      const { position } = await apiUpdatePosition(id, input);
      setPositions((prev) => prev.map((p) => p.id === id ? position : p));
    } catch (e) {
      if (e instanceof CompanyAuthError) setAuthRequired(true);
      else                                setError((e as Error).message);
    }
  }

  async function archivePosition(id: number): Promise<void> {
    try {
      const { position } = await apiArchivePosition(id);
      setPositions((prev) => prev.map((p) => p.id === id ? position : p));
    } catch (e) {
      if (e instanceof CompanyAuthError) setAuthRequired(true);
      else                                setError((e as Error).message);
    }
  }

  async function reactivatePosition(id: number): Promise<void> {
    try {
      const { position } = await apiReactivatePosition(id);
      setPositions((prev) => prev.map((p) => p.id === id ? position : p));
    } catch (e) {
      if (e instanceof CompanyAuthError) setAuthRequired(true);
      else                                setError((e as Error).message);
    }
  }

  return {
    stats, recentActivity, messages, savedDevs, positions,
    loading, error, authRequired,
    saveDev, updateNote, removeSavedDev,
    createPosition, updatePosition, archivePosition, reactivatePosition,
  };
}
