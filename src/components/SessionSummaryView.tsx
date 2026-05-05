import { useState } from 'react';
import { X, Clock, Coffee, CupSoda, ChevronDown, ChevronUp } from 'lucide-react';
import { Session, Sale, DrinkButton } from '../lib/supabase';

interface Props {
  session: Session;
  sales: Sale[];
  buttons: DrinkButton[];
  onClose: () => void;
}

const CUP_SIZE_OPTIONS = ['12 oz', '16 oz'];

interface Tally { label: string; count: number; pct: number; }

function tally(values: string[], relativeTo: number): Tally[] {
  const counts: Record<string, number> = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  const total = relativeTo || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }));
}

function BarRow({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-stone-300">{label}</span>
        <span className="text-sm font-semibold text-stone-100 tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function CollapseSection({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-stone-100">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-amber-400 tabular-nums">{count}</span>
          {open
            ? <ChevronUp size={14} className="text-stone-500" />
            : <ChevronDown size={14} className="text-stone-500" />
          }
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-stone-700/60 pt-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function TopSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider group-hover:text-stone-400 transition-colors">
          {title}
        </h3>
        {open
          ? <ChevronUp size={14} className="text-stone-600 group-hover:text-stone-400 transition-colors" />
          : <ChevronDown size={14} className="text-stone-600 group-hover:text-stone-400 transition-colors" />
        }
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}

export default function SessionSummaryView({ session, sales, buttons, onClose }: Props) {
  function getButtonColor(label: string) {
    return buttons.find(b => b.label === label)?.color ?? '#6B7280';
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  // Group sales by drink label
  const salesByDrink: Record<string, Sale[]> = {};
  for (const s of sales) {
    if (!salesByDrink[s.button_label]) salesByDrink[s.button_label] = [];
    salesByDrink[s.button_label].push(s);
  }
  const drinkEntries = Object.entries(salesByDrink).sort((a, b) => b[1].length - a[1].length);

  // Session-wide cup size + modifier totals
  const allCupValues = sales.flatMap(s => s.modifier_labels.filter(l => CUP_SIZE_OPTIONS.includes(l)));
  const allOtherValues = sales.flatMap(s => s.modifier_labels.filter(l => !CUP_SIZE_OPTIONS.includes(l)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-stone-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 px-8 pt-8 pb-6 border-b border-stone-700 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold text-stone-100 pr-10">{session.name}</h2>
          <div className="flex items-center gap-1.5 mt-2 text-stone-400 text-sm">
            <Clock size={13} />
            <span>{formatDate(session.started_at)}</span>
          </div>
          {session.ended_at && (
            <p className="text-xs text-stone-500 mt-1">Ended {formatDate(session.ended_at)}</p>
          )}
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-5xl font-bold text-amber-400 tabular-nums">{sales.length}</span>
            <span className="text-stone-400 text-lg">drinks sold</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {session.active_button_ids && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-700/60 text-xs text-stone-400">
                <Coffee size={11} />
                {session.active_button_ids.length} drink{session.active_button_ids.length !== 1 ? 's' : ''} active
              </span>
            )}
            {session.cup_size_enabled && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/40 text-xs text-amber-500">
                <CupSoda size={11} />
                Cup size tracked
              </span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {drinkEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-stone-600">
              <Coffee size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No sales recorded</p>
            </div>
          ) : (
            <>
              {/* Per-drink cards */}
              <TopSection title="Drinks">
                {drinkEntries.map(([label, drinkSales]) => {
                  const color = getButtonColor(label);
                  const count = drinkSales.length;
                  const cupVals = drinkSales.flatMap(s => s.modifier_labels.filter(l => CUP_SIZE_OPTIONS.includes(l)));
                  const otherVals = drinkSales.flatMap(s => s.modifier_labels.filter(l => !CUP_SIZE_OPTIONS.includes(l)));
                  const cupTally = tally(cupVals, cupVals.length);
                  const otherTally = tally(otherVals, otherVals.length);
                  const hasModData = cupVals.length > 0 || otherVals.length > 0;

                  return (
                    <CollapseSection key={label} title={label} count={count} color={color}>
                      {/* Overall bar for this drink */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-stone-500">Share of session</span>
                          <span className="text-xs text-stone-400 tabular-nums">{Math.round((count / sales.length) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round((count / sales.length) * 100)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>

                      {!hasModData && (
                        <p className="text-xs text-stone-600 italic">No modifier data</p>
                      )}

                      {cupVals.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Cup Size</p>
                          <div className="space-y-2">
                            {cupTally.map(t => (
                              <BarRow key={t.label} label={t.label} count={t.count} pct={t.pct} color="#D97706" />
                            ))}
                          </div>
                        </div>
                      )}

                      {otherVals.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Modifiers</p>
                          <div className="space-y-2">
                            {otherTally.map(t => (
                              <BarRow key={t.label} label={t.label} count={t.count} pct={t.pct} color={color} />
                            ))}
                          </div>
                        </div>
                      )}
                    </CollapseSection>
                  );
                })}
              </TopSection>

              {/* Session-wide cup size totals */}
              {allCupValues.length > 0 && (
                <TopSection title="Cup Size — All Drinks">
                  {tally(allCupValues, allCupValues.length).map(t => (
                    <BarRow key={t.label} label={t.label} count={t.count} pct={t.pct} color="#D97706" />
                  ))}
                </TopSection>
              )}

              {/* Session-wide modifier totals */}
              {allOtherValues.length > 0 && (
                <TopSection title="Modifiers — All Drinks">
                  {tally(allOtherValues, allOtherValues.length).map(t => (
                    <BarRow key={t.label} label={t.label} count={t.count} pct={t.pct} color="#78716C" />
                  ))}
                </TopSection>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
