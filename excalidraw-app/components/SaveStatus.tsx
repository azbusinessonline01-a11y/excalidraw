import React, { useEffect, useState } from "react";
import { useAtomValue } from "../app-jotai";
import { isSavingAtom, lastSavedAtom } from "../data/LocalData";

const formatRelativeTime = (ts: number): string => {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) {
    return "just now";
  }
  if (diff < 60) {
    return `${diff}s ago`;
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }
  return `${Math.floor(diff / 3600)}h ago`;
};

export const SaveStatus: React.FC = () => {
  const isSaving = useAtomValue(isSavingAtom);
  const lastSaved = useAtomValue(lastSavedAtom);
  const [, forceUpdate] = useState(0);

  // Refresh the relative time display every 10 seconds
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  if (isSaving) {
    return (
      <div className="save-status save-status--saving" title="Saving…">
        <span className="save-status__dot save-status__dot--pulse" />
        <span className="save-status__label">Saving…</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="save-status save-status--saved" title={`Last saved ${formatRelativeTime(lastSaved)}`}>
        <span className="save-status__dot" />
        <span className="save-status__label">Saved {formatRelativeTime(lastSaved)}</span>
      </div>
    );
  }

  return null;
};
