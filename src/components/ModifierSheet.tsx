import { useState, useRef, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react';
import { DrinkButton, ButtonModifier } from '../lib/supabase';

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export interface SaleGroup {
  modifiers: string[];
  count: number;
}

interface Props {
  button: DrinkButton;
  modifiers: ButtonModifier[];
  cupSizeRequired: boolean;
  onConfirm: (saleGroups: SaleGroup[]) => void;
  onCancel: () => void;
}

const MAX_QTY = 20;

// qty[modifierId][option] = count
type OptionQty = Record<string, Record<string, number>>;

function sumGroup(group: Record<string, number>): number {
  return Object.values(group).reduce((a, b) => a + b, 0);
}

function dominantOption(group: Record<string, number>): string | null {
  let max = -1;
  let key: string | null = null;
  for (const [k, v] of Object.entries(group)) {
    if (v > max) { max = v; key = k; }
  }
  return key;
}

export default function ModifierSheet({ button, modifiers, cupSizeRequired, onConfirm, onCancel }: Props) {
  const [quantity, setQuantity] = useState(1);
  // For each modifier group, track per-option counts
  const [optionQty, setOptionQty] = useState<OptionQty>(() =>
    Object.fromEntries(modifiers.map(m => [m.id, {}]))
  );

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sorted = [...modifiers].sort((a, b) => a.display_order - b.display_order);

  // When total quantity changes, rescale all active options proportionally,
  // then fix remainders by adjusting the dominant option.
  const applyNewQuantity = useCallback((newQty: number, currentOptionQty: OptionQty): OptionQty => {
    const next: OptionQty = {};
    for (const mod of modifiers) {
      const group = currentOptionQty[mod.id];
      const activeEntries = Object.entries(group).filter(([, v]) => v > 0);
      if (activeEntries.length === 0) {
        next[mod.id] = {};
        continue;
      }
      // Distribute newQty proportionally
      const oldTotal = activeEntries.reduce((s, [, v]) => s + v, 0);
      const scaled: Record<string, number> = {};
      let assigned = 0;
      for (const [opt, v] of activeEntries) {
        const share = Math.floor((v / oldTotal) * newQty);
        scaled[opt] = share;
        assigned += share;
      }
      // Give remainder to dominant option
      const remainder = newQty - assigned;
      const dom = activeEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
      scaled[dom] = (scaled[dom] ?? 0) + remainder;
      next[mod.id] = scaled;
    }
    return next;
  }, [modifiers]);

  function changeQuantity(delta: number) {
    setQuantity(prev => {
      const next = Math.max(1, Math.min(MAX_QTY, prev + delta));
      setOptionQty(oq => applyNewQuantity(next, oq));
      return next;
    });
  }

  function startRepeat(fn: () => void) {
    fn();
    longPressTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(fn, 80);
    }, 400);
  }

  function stopRepeat() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
  }

  function activateOption(modId: string, option: string) {
    setOptionQty(prev => {
      const group = { ...prev[modId] };
      // Already active — deactivate if others remain
      if ((group[option] ?? 0) > 0) {
        const others = Object.entries(group).filter(([k, v]) => k !== option && v > 0);
        if (others.length === 0) return prev; // can't deactivate last option
        // Give this option's count to dominant other
        const dom = others.reduce((a, b) => a[1] > b[1] ? a : b)[0];
        group[dom] = (group[dom] ?? 0) + group[option];
        group[option] = 0;
        return { ...prev, [modId]: group };
      }
      // Activate: start at 1, take from dominant
      const dom = dominantOption(group);
      if (dom && group[dom] > 1) {
        group[dom] = group[dom] - 1;
        group[option] = 1;
      } else if (dom && group[dom] === 1) {
        // Only 1 left in dominant — can't split further unless qty > 1
        const total = sumGroup(group);
        if (total < quantity) {
          // Shouldn't happen, but just add 1
          group[option] = 1;
        } else {
          return prev; // can't activate with no room
        }
      } else {
        // Nothing active yet — this is the first selection
        group[option] = quantity;
      }
      return { ...prev, [modId]: group };
    });
  }

  function nudgeOption(modId: string, option: string, delta: number) {
    setOptionQty(prev => {
      const group = { ...prev[modId] };
      const total = sumGroup(group);
      const cur = group[option] ?? 0;
      if (delta > 0) {
        // Increase this option: take from largest other
        const others = Object.entries(group).filter(([k, v]) => k !== option && v > 0);
        if (others.length === 0) return prev;
        const dom = others.reduce((a, b) => a[1] > b[1] ? a : b)[0];
        if (group[dom] <= 0) return prev;
        group[dom] = group[dom] - 1;
        group[option] = cur + 1;
      } else {
        // Decrease this option: give to dominant other, or deactivate
        if (cur <= 1) {
          const others = Object.entries(group).filter(([k, v]) => k !== option && v > 0);
          if (others.length === 0) return prev;
          const dom = others.reduce((a, b) => a[1] > b[1] ? a : b)[0];
          group[dom] = group[dom] + cur;
          group[option] = 0;
        } else {
          const others = Object.entries(group).filter(([k]) => k !== option);
          const dom = others.length > 0 ? others.reduce((a, b) => (group[a[0]] ?? 0) > (group[b[0]] ?? 0) ? a : b)[0] : null;
          if (dom) group[dom] = (group[dom] ?? 0) + 1;
          else group[option] = Math.max(0, cur - 1 + (total - cur)); // fallback
          group[option] = cur - 1;
        }
      }
      return { ...prev, [modId]: group };
    });
  }

  // Validation: every modifier group must sum to quantity
  const allValid = sorted.every(m => sumGroup(optionQty[m.id] ?? {}) === quantity);

  function confirm() {
    if (!allValid) return;
    // Build sale groups: for each combination of active options across modifier groups,
    // we just record totals independently. Since no combination pairing is needed,
    // we emit `quantity` sale records each carrying all active modifier labels
    // weighted by their count — i.e. expand per-option counts back into individual sales.
    // Strategy: each sale gets one option per modifier group.
    // We interleave: sort options by count desc, assign round-robin.
    const perSaleModifiers: string[][] = Array.from({ length: quantity }, () => []);

    for (const mod of sorted) {
      const group = optionQty[mod.id] ?? {};
      // Build ordered list of options for this modifier, expanding by count
      const expanded: string[] = [];
      for (const [opt, cnt] of Object.entries(group)) {
        for (let i = 0; i < cnt; i++) expanded.push(opt);
      }
      // Assign to sale slots
      for (let i = 0; i < quantity; i++) {
        if (expanded[i] !== undefined) perSaleModifiers[i].push(expanded[i]);
      }
    }

    // Collapse identical modifier combos into groups
    const groupMap: Map<string, number> = new Map();
    for (const labels of perSaleModifiers) {
      const key = labels.join('|');
      groupMap.set(key, (groupMap.get(key) ?? 0) + 1);
    }
    const saleGroups: SaleGroup[] = Array.from(groupMap.entries()).map(([key, count]) => ({
      modifiers: key ? key.split('|') : [],
      count,
    }));

    onConfirm(saleGroups);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div
        className="relative w-full max-w-2xl bg-stone-900 rounded-b-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '82vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-2 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden shrink-0"
              style={{ backgroundColor: button.color }}
            >
              {button.image_url && (
                <img src={button.image_url} alt="" className="w-full h-full object-cover opacity-70" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100">{button.label}</h2>
              <p className="text-xs text-stone-400">
                {cupSizeRequired ? 'All options required' : 'Select options'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body: modifiers + quantity side by side */}
        <div className="flex flex-1 min-h-0 gap-4 px-6 pb-4">
          {/* Modifier rows */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-2">
            {sorted.map(modifier => {
              const group = optionQty[modifier.id] ?? {};
              const groupSum = sumGroup(group);
              const isRequired = modifier.id === '__cup_size__' || cupSizeRequired;
              const notFilled = groupSum !== quantity;

              return (
                <div key={modifier.id}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      {modifier.label}
                    </h3>
                    {isRequired && notFilled && (
                      <span className="text-xs text-rose-400 font-medium">Required</span>
                    )}
                    {groupSum > 0 && !notFilled && (
                      <span className="text-xs text-emerald-500 font-medium">{groupSum} selected</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {modifier.options.map(option => {
                      const count = group[option] ?? 0;
                      const isActive = count > 0;
                      const canIncrease = isActive && Object.entries(group).some(([k, v]) => k !== option && v > 0);
                      const canDecrease = isActive;

                      return (
                        <div key={option} className="flex flex-col items-center gap-1">
                          {/* Option chip */}
                          <button
                            onClick={() => activateOption(modifier.id, option)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all"
                            style={{
                              borderColor: isActive ? button.color : 'rgba(255,255,255,0.1)',
                              backgroundColor: isActive ? `${button.color}33` : 'rgba(255,255,255,0.04)',
                              color: isActive ? '#fff' : '#A8A29E',
                            }}
                          >
                            {option}
                            {isActive && quantity > 1 && (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ml-0.5"
                                style={{ backgroundColor: button.color }}
                              >
                                {count}
                              </span>
                            )}
                          </button>

                          {/* Per-option stepper (only when multiple options active and qty > 1) */}
                          {isActive && quantity > 1 && Object.values(group).filter(v => v > 0).length > 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => nudgeOption(modifier.id, option, -1)}
                                disabled={!canDecrease}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 disabled:opacity-30 transition-colors"
                              >
                                <Minus size={10} className="text-stone-300" />
                              </button>
                              <button
                                onClick={() => nudgeOption(modifier.id, option, 1)}
                                disabled={!canIncrease}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 disabled:opacity-30 transition-colors"
                              >
                                <Plus size={10} className="text-stone-300" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vertical quantity picker */}
          <div className="flex flex-col items-center justify-center gap-1 shrink-0 w-14">
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">Qty</p>
            <button
              onPointerDown={() => startRepeat(() => changeQuantity(1))}
              onPointerUp={stopRepeat}
              onPointerLeave={stopRepeat}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-600 transition-colors touch-none"
            >
              <ChevronUp size={18} className="text-stone-300" />
            </button>

            <div
              className="w-14 h-16 flex items-center justify-center rounded-2xl border-2 font-bold text-2xl tabular-nums transition-all"
              style={{
                borderColor: button.color,
                backgroundColor: `${button.color}22`,
                color: isLightColor(button.color) ? '#1c1917' : '#fff',
              }}
            >
              {quantity}
            </div>

            <button
              onPointerDown={() => startRepeat(() => changeQuantity(-1))}
              onPointerUp={stopRepeat}
              onPointerLeave={stopRepeat}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-600 transition-colors touch-none"
            >
              <ChevronDown size={18} className="text-stone-300" />
            </button>
          </div>
        </div>

        {/* Confirm button */}
        <div className="px-6 pb-8 pt-3 border-t border-stone-800 shrink-0">
          <button
            onClick={confirm}
            disabled={!allValid}
            className="w-full py-4 rounded-2xl text-white text-lg font-bold transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: button.color }}
          >
            {quantity > 1 ? `Add ${quantity} to Log` : 'Add to Log'}
          </button>
        </div>
      </div>
    </div>
  );
}
