import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDismiss?.(), 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      {message}
      <button className="icon-button" onClick={onDismiss} aria-label="알림 닫기">
        ×
      </button>
    </div>
  );
}
