import { useState } from 'react';
import { X, CupSoda, Check } from 'lucide-react';
import { DrinkButton } from '../lib/supabase';

interface Props {
  buttons: DrinkButton[];
  onConfirm: (name: string, activeButtonIds: string[], cupSizeEnabled: boolean) => void;
  onCancel: () => void;
  creating: boolean;
}

export default function SessionSetupSheet({ buttons, onConfirm, onCancel, creating }: Props) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(buttons.map(b => b.id)));
  const [cupSize, setCupSize] = useState(false);

  function toggleButton(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === buttons.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(buttons.map(b => b.id)));
    }
  }

  const canStart = name.trim().length > 0 && selectedIds.size > 0;

  function handleConfirm() {
    if (!canStart || creating) return;
    onConfirm(name.trim(), Array.from(selectedIds), cupSize);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div
        className="relative w-full max-w-2xl bg-stone-900 rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-2 shrink-0">
          <h2 className="text-xl font-bold text-stone-100">New Session</h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-4">
          {/* Session name */}
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">
              Session Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="e.g. Saturday Market"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          {/* Drinks selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Active Drinks
              </label>
              <button
                onClick={toggleAll}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                {selectedIds.size === buttons.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {buttons.length === 0 ? (
              <p className="text-sm text-stone-500 py-3">No drinks configured yet. Add drinks in the edit panel.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {buttons.map(btn => {
                  const isActive = selectedIds.has(btn.id);
                  return (
                    <button
                      key={btn.id}
                      onClick={() => toggleButton(btn.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: isActive ? btn.color : 'rgba(255,255,255,0.08)',
                        backgroundColor: isActive ? `${btn.color}22` : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                        style={{
                          borderColor: isActive ? btn.color : 'rgba(255,255,255,0.2)',
                          backgroundColor: isActive ? btn.color : 'transparent',
                        }}
                      >
                        {isActive && <Check size={10} strokeWidth={3} className="text-white" />}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: btn.color }}
                        />
                        <span className="text-sm font-medium text-stone-200 truncate">{btn.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedIds.size === 0 && buttons.length > 0 && (
              <p className="text-xs text-rose-400 mt-2">Select at least one drink to continue.</p>
            )}
          </div>

          {/* Cup size toggle */}
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">
              Cup Size
            </label>
            <button
              onClick={() => setCupSize(v => !v)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                cupSize
                  ? 'border-amber-500/60 bg-amber-900/20'
                  : 'border-stone-700 bg-stone-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cupSize ? 'bg-amber-600/30' : 'bg-stone-700'}`}>
                  <CupSoda size={16} className={cupSize ? 'text-amber-400' : 'text-stone-400'} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${cupSize ? 'text-stone-100' : 'text-stone-300'}`}>
                    Track cup size
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {cupSize ? '12 oz / 16 oz required on every drink' : 'No cup size required'}
                  </p>
                </div>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${cupSize ? 'bg-amber-500' : 'bg-stone-600'}`}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: cupSize ? 'translateX(20px)' : 'translateX(2px)' }}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Start button */}
        <div className="px-6 pb-8 pt-4 border-t border-stone-800 shrink-0">
          <button
            onClick={handleConfirm}
            disabled={!canStart || creating}
            className="w-full py-4 rounded-2xl text-white text-base font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-500 active:scale-98"
          >
            {creating ? 'Starting...' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
