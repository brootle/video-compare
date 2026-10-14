import { useState } from 'react';
import { formatTime } from '../utils/video';
import type { Label } from '../types';

type LabelHistoryProps = {
  labels: Label[];
  showKeyboardShortcuts: boolean;
  onUndo: () => void;
  onClear: () => void;
  onExport: () => void;
};

export default function LabelHistory({
  labels,
  showKeyboardShortcuts,
  onUndo,
  onClear,
  onExport,
}: LabelHistoryProps) {
  const [showLabelHistory, setShowLabelHistory] = useState(false);

  const hasLabels = labels.length > 0;

  return (
    <div className="history-container">
      <div className="history-header">
        <h3>Label History</h3>

        <div className="history-actions">
          <button disabled={!hasLabels} onClick={onUndo}>
            Undo {showKeyboardShortcuts && <kbd>Z</kbd>}
          </button>

          <button disabled={!hasLabels} onClick={onClear}>
            Clear
          </button>

          <button disabled={!hasLabels} onClick={onExport}>
            Export JSON
          </button>

          <button
            disabled={!hasLabels}
            onClick={() => setShowLabelHistory((current) => !current)}
          >
            {showLabelHistory
              ? 'Hide history'
              : `Show history (${labels.length})`}
          </button>
        </div>
      </div>

      {labels.length === 0 ? (
        <p className="history-empty">
          You have not marked any labels yet.
        </p>
      ) : showLabelHistory ? (
        <ul className="label-history">
          {labels.map((label, index) => (
            <li key={`${label.createdAt}-${index}`}>
              <strong>
                {label.verdict === 'same'
                  ? 'Same'
                  : `${label.verdict} better`}
              </strong>

              <span>
                Frame {label.frame} · {formatTime(label.time)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="history-empty">
          {labels.length} label{labels.length === 1 ? '' : 's'} recorded.
          {' '}Select Show history to view them.
        </p>
      )}
    </div>
  );
}