import LabelHistory from './LabelHistory';

import type { Label } from '../types';

type CompareControlsProps = {
  activeVideoLabel: 'A' | 'B';
  viewMode: 'ab' | 'side-by-side';
  blindMode: boolean;
  labels: Label[];
  showKeyboardShortcuts: boolean;

  onToggleVideo: () => void;
  onToggleViewMode: () => void;
  onToggleBlindMode: () => void;
  onAddLabel: (verdict: 'A' | 'B' | 'same') => void;
  onUndoLabel: () => void;
  onClearLabels: () => void;
  onExportLabels: () => void;
};

export default function CompareControls({
  activeVideoLabel,
  viewMode,
  blindMode,
  labels,
  showKeyboardShortcuts,
  onToggleVideo,
  onToggleViewMode,
  onToggleBlindMode,
  onAddLabel,
  onUndoLabel,
  onClearLabels,
  onExportLabels,
}: CompareControlsProps) {
  return (
    <section className="block-panel">
      <h2 className="block-panel-header">COMPARE &amp; LABEL</h2>

      <div className="block-panel-content">
        <div className="block-panel-column">
          <div className="block-column-title">
            Showing:{' '}
            <strong>
              {viewMode === 'side-by-side'
                ? 'Video A and B'
                : `Video ${activeVideoLabel}`}
            </strong>
          </div>

          <div className="control-buttons">
            <button onClick={onToggleVideo}>
              Toggle A/B
              {showKeyboardShortcuts && <kbd>Space</kbd>}
            </button>

            <button onClick={onToggleViewMode}>
              Toggle View Mode
            </button>
          </div>

          <label className="switch-label blind-toggle">
            <input
              type="checkbox"
              checked={blindMode}
              onChange={onToggleBlindMode}
            />
            Blind mode
          </label>
        </div>

        <div className="block-panel-column">
          <div className="block-column-title">Mark As</div>

          <div className="control-buttons">
            <button onClick={() => onAddLabel('A')}>
              A better
              {showKeyboardShortcuts && <kbd>1</kbd>}
            </button>

            <button onClick={() => onAddLabel('B')}>
              B better
              {showKeyboardShortcuts && <kbd>2</kbd>}
            </button>

            <button onClick={() => onAddLabel('same')}>
              Same
              {showKeyboardShortcuts && <kbd>3</kbd>}
            </button>
          </div>
        </div>
      </div>

      <LabelHistory
        labels={labels}
        showKeyboardShortcuts={showKeyboardShortcuts}
        onUndo={onUndoLabel}
        onClear={onClearLabels}
        onExport={onExportLabels}
      />
    </section>
  );
}