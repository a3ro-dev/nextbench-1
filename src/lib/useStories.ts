/**
 * React hooks for the Stories row/viewer (Phase 2). Thin layer over the pure `stories.ts`
 * API + existing auth/follow hooks. Keeps `stories.ts` free of React.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useFollowingIds } from './follows';
import { getStoriesTray, type TrayEntry } from './stories';

export interface UseStoriesTray {
  tray: TrayEntry[];
  loading: boolean;
  refetch: () => void;
  /** Optimistically grey an author's ring after their stories are viewed (no refetch). */
  markSeenLocal: (authorId: string) => void;
}

export function useStoriesTray(): UseStoriesTray {
  const { user } = useAuth();
  const { followingIds } = useFollowingIds();
  const [tray, setTray] = useState<TrayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // Guards against out-of-order responses when following/user changes mid-flight.
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!user) {
      setTray([]);
      setLoading(false);
      return;
    }
    const myReq = ++reqId.current;
    setLoading(true);
    try {
      const result = await getStoriesTray(user.uid, Array.from(followingIds));
      if (reqId.current === myReq) setTray(result);
    } catch (err) {
      // Fail quietly — the row simply renders the add slot only.
      console.warn('useStoriesTray: failed to load tray (ignored):', err);
      if (reqId.current === myReq) setTray([]);
    } finally {
      if (reqId.current === myReq) setLoading(false);
    }
  }, [user?.uid, followingIds]);

  useEffect(() => {
    load();
  }, [load]);

  const markSeenLocal = useCallback((authorId: string) => {
    // Flip the ring but keep the bubble's position stable for the session (Instagram-like);
    // ordering only re-sorts on the next refetch.
    setTray((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        if (e.authorId === authorId && e.hasUnseen) {
          changed = true;
          return { ...e, hasUnseen: false };
        }
        return e;
      });
      return changed ? next : prev;
    });
  }, []);

  return { tray, loading, refetch: load, markSeenLocal };
}
