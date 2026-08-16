import { X, Trash2, Coffee } from 'lucide-react';
import { db, Sale, DrinkButton } from '../lib/supabase';

interface Props {
  sales: Sale[];
  buttons: DrinkButton[];
  onClose: () => void;
  onSalesChange: () => void;
  sessionName: string;
}

export default function SalesLogDrawer({ sales, buttons, onClose, onSalesChange, sessionName }: Props) {
  const sorted = [...sales].sort(
    (a, b) => new Date(b.tapped_at).getTime() - new Date(a.tapped_at).getTime()
  );

  // Count per button label (raw drink counts only)
  const counts: Record<string, number> = {};
  for (const s of sales) {
    counts[s.button_label] = (counts[s.button_label] ?? 0) + 1;
  }
  const countEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  async function deleteSale(id: string) {
    await db.delete('sales', [{ column: 'id', value: id }]);
    onSalesChange();
  }

  function getButtonColor(label: string) {
    return buttons.find(b => b.label === label)?.color ?? '#6B7280';
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-stone-900 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-700">
          <div>
            <h2 className="text-xl font-semibold text-stone-100">Sales Log</h2>
            <p className="text-xs text-stone-500 mt-0.5 truncate max-w-[240px]">{sessionName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Totals */}
        {countEntries.length > 0 && (
          <div className="px-6 py-4 border-b border-stone-800">
            <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">Totals</h3>
            <div className="space-y-2">
              {countEntries.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getButtonColor(label) }} />
                  <span className="flex-1 text-sm text-stone-200">{label}</span>
                  <span className="text-sm font-semibold text-stone-100 tabular-nums">{count}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-stone-700 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-300">Total</span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">{sales.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Log */}
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-600">
              <Coffee size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No sales yet</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-800">
              {sorted.map(sale => (
                <div key={sale.id} className="flex items-start gap-3 px-6 py-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: getButtonColor(sale.button_label) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-200">{sale.button_label}</p>
                    {sale.modifier_labels && sale.modifier_labels.length > 0 && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {sale.modifier_labels.join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-stone-500 mt-0.5">{formatTime(sale.tapped_at)}</p>
                  </div>
                  <button
                    onClick={() => deleteSale(sale.id)}
                    className="p-1.5 rounded-lg hover:bg-red-900/40 text-stone-600 hover:text-red-400 transition-colors mt-0.5"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
