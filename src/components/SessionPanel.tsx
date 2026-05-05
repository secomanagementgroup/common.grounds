import { useState } from 'react';
import { X, Clock, CheckCircle, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { supabase, Session, DrinkButton } from '../lib/supabase';
import SessionSetupSheet from './SessionSetupSheet';

interface Props {
  sessions: Session[];
  activeSession: Session | null;
  buttons: DrinkButton[];
  onClose: () => void;
  onSessionsChange: () => void;
  onViewSession: (session: Session) => void;
}

export default function SessionPanel({ sessions, activeSession, buttons, onClose, onSessionsChange, onViewSession }: Props) {
  const [showSetup, setShowSetup] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pastSessions = sessions.filter(s => !s.is_active).sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  async function createSession(name: string, activeButtonIds: string[], cupSizeEnabled: boolean) {
    setCreating(true);
    if (activeSession) {
      await supabase
        .from('sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);
    }
    await supabase.from('sessions').insert({
      name,
      is_active: true,
      active_button_ids: activeButtonIds,
      cup_size_enabled: cupSizeEnabled,
    });
    setCreating(false);
    setShowSetup(false);
    onSessionsChange();
  }

  async function endSession() {
    if (!activeSession) return;
    await supabase
      .from('sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', activeSession.id);
    onSessionsChange();
  }

  async function deleteSession(id: string) {
    setDeleting(true);
    await supabase.from('sales').delete().eq('session_id', id);
    await supabase.from('sessions').delete().eq('id', id);
    setConfirmDeleteId(null);
    setDeleting(false);
    onSessionsChange();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-stretch justify-end">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-stone-900 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-stone-700">
            <h2 className="text-xl font-semibold text-stone-100">Sessions</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors">
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Active session */}
            {activeSession && (
              <div className="rounded-2xl bg-amber-900/30 border border-amber-700/50 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Active Session</span>
                </div>
                <p className="text-lg font-semibold text-stone-100 mt-1">{activeSession.name}</p>
                <p className="text-sm text-stone-400 mt-1">{formatDate(activeSession.started_at)}</p>
                {activeSession.cup_size_enabled && (
                  <p className="text-xs text-amber-600 mt-1">Cup size tracking enabled</p>
                )}
                {activeSession.active_button_ids && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    {activeSession.active_button_ids.length} drink{activeSession.active_button_ids.length !== 1 ? 's' : ''} active
                  </p>
                )}
                <button
                  onClick={endSession}
                  className="mt-4 w-full py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-medium transition-colors"
                >
                  End Session
                </button>
              </div>
            )}

            {/* Start new session */}
            <div>
              <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">New Session</h3>
              <button
                onClick={() => setShowSetup(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors"
              >
                <Plus size={18} />
                Set Up New Session
              </button>
            </div>

            {/* Past sessions */}
            {pastSessions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">Past Sessions</h3>
                <div className="space-y-2">
                  {pastSessions.map(s => {
                    const isConfirming = confirmDeleteId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-stretch rounded-xl border overflow-hidden transition-colors ${
                          isConfirming
                            ? 'border-rose-700/60 bg-rose-950/40'
                            : 'border-stone-700 bg-stone-800'
                        }`}
                      >
                        {/* Main tap area */}
                        <button
                          onClick={() => { if (!isConfirming) { onViewSession(s); onClose(); } }}
                          className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
                        >
                          <CheckCircle size={16} className="text-stone-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-200 truncate">{s.name}</p>
                            <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                              <Clock size={10} />
                              {formatDate(s.started_at)}
                            </p>
                          </div>
                          {!isConfirming && <ChevronRight size={16} className="text-stone-600 shrink-0" />}
                        </button>

                        {/* Delete / confirm area */}
                        {isConfirming ? (
                          <div className="flex items-center gap-1 px-3 border-l border-rose-700/40">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-700 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteSession(s.id)}
                              disabled={deleting}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
                            className="px-4 border-l border-stone-700 text-stone-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSetup && (
        <SessionSetupSheet
          buttons={buttons}
          onConfirm={createSession}
          onCancel={() => setShowSetup(false)}
          creating={creating}
        />
      )}
    </>
  );
}
