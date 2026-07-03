/**
 * Stories container: owns the shared tray state and open/close state, wiring the row and
 * the viewer together. This is the single component the feed mounts.
 */
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../lib/ToastContext';
import { useStoriesTray } from '../../lib/useStories';
import StoriesRow from './StoriesRow';
import StoryViewer from './StoryViewer';

export default function Stories() {
  const { user, userData } = useAuth();
  const { showToast } = useToast();
  const { tray, loading, markSeenLocal } = useStoriesTray();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Creation lands in Phase 3 — the "+" is a stubbed hook for now.
  const handleAdd = () => showToast('Story creation is coming soon.', 'info');

  return (
    <>
      <StoriesRow
        tray={tray}
        loading={loading}
        currentUid={user?.uid ?? null}
        currentUserName={userData?.username || userData?.name || 'You'}
        currentUserPhoto={userData?.profilePicture ?? null}
        onOpenAuthor={setOpenIndex}
        onAdd={handleAdd}
      />
      <AnimatePresence>
        {openIndex !== null && user && (
          <StoryViewer
            key="story-viewer"
            tray={tray}
            initialAuthorIndex={openIndex}
            currentUid={user.uid}
            onClose={() => setOpenIndex(null)}
            onSeen={markSeenLocal}
          />
        )}
      </AnimatePresence>
    </>
  );
}
