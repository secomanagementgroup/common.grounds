import { useEffect, useState, useCallback, useRef } from 'react';
import { Settings, BarChart2, Coffee, List } from 'lucide-react';
import { supabase, Session, DrinkButton, ButtonModifier, Sale } from './lib/supabase';
import SessionPanel from './components/SessionPanel';
import EditButtonsPanel from './components/EditButtonsPanel';
import SalesLogDrawer from './components/SalesLogDrawer';
import SessionSummaryView from './components/SessionSummaryView';
import ModifierSheet, { SaleGroup } from './components/ModifierSheet';

type ActivePanel = 'session' | 'edit' | 'log' | null;

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [buttons, setButtons] = useState<DrinkButton[]>([]);
  const [modifiers, setModifiers] = useState<ButtonModifier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [panel, setPanel] = useState<ActivePanel>(null);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [viewingSales, setViewingSales] = useState<Sale[]>([]);
  const [tappedId, setTappedId] = useState<string | null>(null);
  const [modifierButton, setModifierButton] = useState<DrinkButton | null>(null);
  const tappedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSessions = useCallback(async () => {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (data) {
      setSessions(data);
      setActiveSession(data.find(s => s.is_active) ?? null);
    }
  }, []);

  const loadButtons = useCallback(async () => {
    const { data } = await supabase.from('drink_buttons').select('*').order('display_order');
    if (data) setButtons(data);
  }, []);

  const loadModifiers = useCallback(async () => {
    const { data } = await supabase.from('button_modifiers').select('*').order('display_order');
    if (data) setModifiers(data);
  }, []);

  const loadSales = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('session_id', sessionId)
      .order('tapped_at', { ascending: false });
    if (data) setSales(data);
  }, []);

  useEffect(() => {
    loadSessions();
    loadButtons();
    loadModifiers();
  }, [loadSessions, loadButtons, loadModifiers]);

  useEffect(() => {
    if (activeSession) loadSales(activeSession.id);
    else setSales([]);
  }, [activeSession, loadSales]);

  function flashButton(id: string) {
    if (tappedTimer.current) clearTimeout(tappedTimer.current);
    setTappedId(id);
    tappedTimer.current = setTimeout(() => setTappedId(null), 350);
  }

  async function recordSale(btn: DrinkButton, saleGroups: SaleGroup[]) {
    if (!activeSession) return;
    flashButton(btn.id);
    const rows = saleGroups.flatMap(g =>
      Array.from({ length: g.count }, () => ({
        session_id: activeSession.id,
        button_id: btn.id,
        button_label: btn.label,
        modifier_labels: g.modifiers,
      }))
    );
    if (rows.length === 0) return;
    const { data } = await supabase.from('sales').insert(rows).select();
    if (data) setSales(prev => [...data.reverse(), ...prev]);
  }

  async function recordSimpleSale(btn: DrinkButton) {
    return recordSale(btn, [{ modifiers: [], count: 1 }]);
  }

  const cupSizeModifier: ButtonModifier = {
    id: '__cup_size__',
    button_id: '',
    label: 'Cup Size',
    options: ['12 oz', '16 oz'],
    display_order: -1,
    created_at: '',
  };

  function tapButton(btn: DrinkButton) {
    if (!activeSession) return;
    const btnModifiers = modifiers.filter(m => m.button_id === btn.id);
    const hasCupSize = activeSession.cup_size_enabled;
    const allModifiers = hasCupSize ? [cupSizeModifier, ...btnModifiers] : btnModifiers;
    // Quick tap: is_toggle AND no cup size required, OR no modifiers at all
    if (btn.is_toggle && !hasCupSize) {
      recordSimpleSale(btn);
    } else if (allModifiers.length === 0) {
      recordSimpleSale(btn);
    } else {
      flashButton(btn.id);
      setModifierButton(btn);
    }
  }

  async function loadViewingSession(session: Session) {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('session_id', session.id)
      .order('tapped_at', { ascending: false });
    setViewingSales(data ?? []);
    setViewingSession(session);
  }

  const togglePanel = (p: ActivePanel) => setPanel(prev => prev === p ? null : p);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-stone-900 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/CommonGroundsCUPONLY.png" alt="Common Grounds" className="w-9 h-9 object-contain" />
          <div>
            <h1 className="text-base font-bold text-stone-100 leading-tight">Common Grounds</h1>
            {activeSession ? (
              <p className="text-xs text-amber-400 leading-tight truncate max-w-[200px]">{activeSession.name}</p>
            ) : (
              <p className="text-xs text-stone-500 leading-tight">No active session</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700">
              <span className="text-xs text-stone-400">Sold</span>
              <span className="text-sm font-bold text-amber-400 tabular-nums">{sales.length}</span>
            </div>
          )}

          <button
            onClick={() => togglePanel('log')}
            disabled={!activeSession}
            className="relative p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-700 transition-colors"
          >
            <List size={20} className="text-stone-300" />
            {sales.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold text-stone-900 flex items-center justify-center">
                {sales.length > 99 ? '99+' : sales.length}
              </span>
            )}
          </button>

          <button
            onClick={() => togglePanel('edit')}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-colors"
          >
            <Settings size={20} className="text-stone-300" />
          </button>

          <button
            onClick={() => togglePanel('session')}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-colors"
          >
            <BarChart2 size={20} className="text-stone-300" />
          </button>
        </div>
      </header>

      {/* No active session banner */}
      {!activeSession && (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-amber-900/20 border border-amber-700/40 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-300">Start a session to begin tracking sales.</p>
          <button
            onClick={() => setPanel('session')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors shrink-0"
          >
            Start Session
          </button>
        </div>
      )}

      {/* Button Grid */}
      <main className="flex-1 p-4 overflow-y-auto flex flex-col">
        {buttons.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-stone-600">
            <Coffee size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium text-stone-500">No buttons yet</p>
            <p className="text-sm mt-1">Tap the settings icon to add your drinks.</p>
            <button
              onClick={() => setPanel('edit')}
              className="mt-6 px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 font-medium transition-colors"
            >
              Add Buttons
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-center flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
              {(activeSession?.active_button_ids
                ? buttons.filter(b => activeSession.active_button_ids!.includes(b.id))
                : buttons
              ).map(btn => {
                const isTapped = tappedId === btn.id;
                const hasModifiers = (!btn.is_toggle || activeSession?.cup_size_enabled) &&
                  (modifiers.some(m => m.button_id === btn.id) || (activeSession?.cup_size_enabled ?? false));
                return (
                  <button
                    key={btn.id}
                    onClick={() => tapButton(btn)}
                    disabled={!activeSession}
                    className="relative rounded-3xl overflow-hidden border-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: btn.color,
                      borderColor: 'rgba(0,0,0,0.15)',
                      minHeight: '160px',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      transform: isTapped ? 'scale(0.94)' : 'scale(1)',
                      boxShadow: isTapped
                        ? `0 0 0 4px rgba(255,255,255,0.8), 0 0 30px 6px ${btn.color}88`
                        : `0 6px 24px ${btn.color}44`,
                    }}
                  >
                    {btn.image_url && (
                      <div className="absolute inset-0">
                        <img src={btn.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/45" />
                      </div>
                    )}

                    {isTapped && (
                      <div className="absolute inset-0 bg-white/25" />
                    )}

                    <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 py-8 gap-2">
                      <span
                        className="text-2xl font-extrabold text-center leading-tight"
                        style={{
                          color: isLightColor(btn.color) ? '#1c1917' : '#ffffff',
                          textShadow: isLightColor(btn.color) ? '0 1px 3px rgba(255,255,255,0.4)' : '0 2px 6px rgba(0,0,0,0.7)',
                        }}
                      >
                        {btn.label}
                      </span>
                      {hasModifiers && (
                        <span
                          className="text-xs font-medium"
                          style={{ color: isLightColor(btn.color) ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)' }}
                        >
                          tap to customize
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Panels */}
      {panel === 'session' && (
        <SessionPanel
          sessions={sessions}
          activeSession={activeSession}
          buttons={buttons}
          onClose={() => setPanel(null)}
          onSessionsChange={loadSessions}
          onViewSession={loadViewingSession}
        />
      )}
      {panel === 'edit' && (
        <EditButtonsPanel
          buttons={buttons}
          modifiers={modifiers}
          onClose={() => setPanel(null)}
          onButtonsChange={loadButtons}
          onModifiersChange={loadModifiers}
        />
      )}
      {panel === 'log' && activeSession && (
        <SalesLogDrawer
          sales={sales}
          buttons={buttons}
          sessionName={activeSession.name}
          onClose={() => setPanel(null)}
          onSalesChange={() => loadSales(activeSession.id)}
        />
      )}

      {viewingSession && (
        <SessionSummaryView
          session={viewingSession}
          sales={viewingSales}
          buttons={buttons}
          onClose={() => setViewingSession(null)}
        />
      )}

      {/* Modifier sheet */}
      {modifierButton && (
        <ModifierSheet
          button={modifierButton}
          modifiers={[
            ...(activeSession?.cup_size_enabled ? [cupSizeModifier] : []),
            ...modifiers.filter(m => m.button_id === modifierButton.id),
          ]}
          cupSizeRequired={activeSession?.cup_size_enabled ?? false}
          onConfirm={saleGroups => {
            recordSale(modifierButton, saleGroups);
            setModifierButton(null);
          }}
          onCancel={() => setModifierButton(null)}
        />
      )}
    </div>
  );
}
