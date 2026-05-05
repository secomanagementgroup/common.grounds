import { useState, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, Upload, ChevronDown, ChevronUp, Image } from 'lucide-react';
import { supabase, DrinkButton, ButtonModifier } from '../lib/supabase';

const PALETTE = [
  '#C2855A', '#8B5E3C', '#4A2C17', '#2C4A6E',
  '#5C3D2E', '#5A7A4A', '#B45309', '#0F766E',
  '#B91C1C', '#1D4ED8', '#6B7280', '#1C1917',
  '#D97706', '#059669', '#DC2626', '#2563EB',
];

interface Props {
  buttons: DrinkButton[];
  modifiers: ButtonModifier[];
  onClose: () => void;
  onButtonsChange: () => void;
  onModifiersChange: () => void;
}

export default function EditButtonsPanel({ buttons, modifiers, onClose, onButtonsChange, onModifiersChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editIsToggle, setEditIsToggle] = useState(false);
  const [expandedModifiers, setExpandedModifiers] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newModLabel, setNewModLabel] = useState('');
  const [newModOptions, setNewModOptions] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function getButtonModifiers(buttonId: string) {
    return modifiers.filter(m => m.button_id === buttonId).sort((a, b) => a.display_order - b.display_order);
  }

  function startEdit(btn: DrinkButton) {
    setEditingId(btn.id);
    setEditLabel(btn.label);
    setEditColor(btn.color);
    setEditImageUrl(btn.image_url ?? '');
    setEditIsToggle(btn.is_toggle);
  }

  async function saveEdit(btn: DrinkButton) {
    await supabase.from('drink_buttons').update({
      label: editLabel.trim() || btn.label,
      color: editColor,
      image_url: editImageUrl.trim() || null,
      is_toggle: editIsToggle,
    }).eq('id', btn.id);
    setEditingId(null);
    onButtonsChange();
  }

  async function deleteButton(id: string) {
    await supabase.from('drink_buttons').delete().eq('id', id);
    onButtonsChange();
    onModifiersChange();
  }

  async function addButton() {
    const maxOrder = buttons.reduce((m, b) => Math.max(m, b.display_order), 0);
    await supabase.from('drink_buttons').insert({
      label: 'New Drink',
      color: '#C2855A',
      display_order: maxOrder + 1,
      is_toggle: false,
    });
    onButtonsChange();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from('button-images')
      .upload(filename, file, { upsert: false });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('button-images').getPublicUrl(data.path);
      setEditImageUrl(urlData.publicUrl);
    }
    setUploading(false);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function addModifier(buttonId: string) {
    if (!newModLabel.trim()) return;
    const options = newModOptions.split(',').map(o => o.trim()).filter(Boolean);
    const existing = getButtonModifiers(buttonId);
    await supabase.from('button_modifiers').insert({
      button_id: buttonId,
      label: newModLabel.trim(),
      options,
      display_order: existing.length,
    });
    setNewModLabel('');
    setNewModOptions('');
    onModifiersChange();
  }

  async function deleteModifier(id: string) {
    await supabase.from('button_modifiers').delete().eq('id', id);
    onModifiersChange();
  }

  async function updateModifierOptions(modifier: ButtonModifier, rawOptions: string) {
    const options = rawOptions.split(',').map(o => o.trim()).filter(Boolean);
    await supabase.from('button_modifiers').update({ options }).eq('id', modifier.id);
    onModifiersChange();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-stone-900 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-700">
          <h2 className="text-xl font-semibold text-stone-100">Edit Buttons</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {buttons.map(btn => {
            const btnModifiers = getButtonModifiers(btn.id);
            return (
              <div key={btn.id} className="rounded-2xl bg-stone-800 border border-stone-700 overflow-hidden">
                {editingId === btn.id ? (
                  <div className="p-4 space-y-4">
                    {/* Label */}
                    <div>
                      <label className="text-xs font-medium text-stone-400 uppercase tracking-wider block mb-1.5">Label</label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-stone-700 border border-stone-600 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label className="text-xs font-medium text-stone-400 uppercase tracking-wider block mb-1.5">Color</label>
                      <div className="grid grid-cols-8 gap-2">
                        {PALETTE.map(c => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                            style={{ backgroundColor: c, borderColor: editColor === c ? '#FFFFFF' : 'transparent' }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-8 h-8 rounded-lg border border-stone-600" style={{ backgroundColor: editColor }} />
                        <input
                          type="text"
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-stone-700 border border-stone-600 text-stone-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>

                    {/* Image */}
                    <div>
                      <label className="text-xs font-medium text-stone-400 uppercase tracking-wider block mb-1.5">Button Image</label>
                      <div className="space-y-2">
                        {editImageUrl && (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden border border-stone-600">
                            <img src={editImageUrl} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setEditImageUrl('')}
                              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={editImageUrl}
                            onChange={e => setEditImageUrl(e.target.value)}
                            className="flex-1 px-3 py-2.5 rounded-lg bg-stone-700 border border-stone-600 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                            placeholder="Paste image URL..."
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-stone-700 hover:bg-stone-600 border border-stone-600 text-stone-300 text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
                          >
                            {uploading ? (
                              <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Upload size={15} />
                            )}
                            {!uploading && <span>Upload</span>}
                          </button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(btn)}
                        className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Collapsed row */}
                    <div className="flex items-center gap-3 p-3">
                      <GripVertical size={16} className="text-stone-600 shrink-0" />
                      <div
                        className="w-10 h-10 rounded-lg shrink-0 border border-white/10 overflow-hidden"
                        style={{ backgroundColor: btn.color }}
                      >
                        {btn.image_url
                          ? <img src={btn.image_url} alt="" className="w-full h-full object-cover opacity-70" />
                          : <Image size={16} className="text-white/40 m-auto mt-2.5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-100 font-medium text-sm truncate">{btn.label}</p>
                        <p className="text-xs text-stone-500">
                          {btn.is_toggle ? 'Quick tap' : btnModifiers.length > 0 ? `${btnModifiers.length} modifier${btnModifiers.length > 1 ? 's' : ''}` : 'No modifiers'}
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(btn)}
                        className="px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setExpandedModifiers(expandedModifiers === btn.id ? null : btn.id)}
                        className="p-1.5 rounded-lg hover:bg-stone-700 text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {expandedModifiers === btn.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        onClick={() => deleteButton(btn.id)}
                        className="p-1.5 rounded-lg hover:bg-red-900/40 text-stone-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Modifier section */}
                    {expandedModifiers === btn.id && (
                      <div className="border-t border-stone-700 p-4 space-y-3 bg-stone-900/60">
                        <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Modifier Options</h4>

                        {/* Existing modifiers */}
                        {btnModifiers.length > 0 && (
                          <div className="space-y-2">
                            {btnModifiers.map(mod => (
                              <div key={mod.id} className="rounded-lg bg-stone-800 border border-stone-700 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-stone-200">{mod.label}</span>
                                  <button
                                    onClick={() => deleteModifier(mod.id)}
                                    className="p-1 rounded hover:bg-red-900/40 text-stone-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  defaultValue={mod.options.join(', ')}
                                  onBlur={e => updateModifierOptions(mod, e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-md bg-stone-700 border border-stone-600 text-stone-300 text-xs focus:outline-none focus:border-amber-500"
                                  placeholder="Option 1, Option 2, Option 3"
                                />
                                <p className="text-xs text-stone-600 mt-1">Comma-separated options</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add new modifier line */}
                        <div className="rounded-lg border border-dashed border-stone-600 p-3 space-y-2">
                          <p className="text-xs text-stone-500 font-medium">Add modifier line</p>
                          <input
                            type="text"
                            value={newModLabel}
                            onChange={e => setNewModLabel(e.target.value)}
                            placeholder="Line label (e.g. Milk Type)"
                            className="w-full px-2.5 py-1.5 rounded-md bg-stone-800 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="text"
                            value={newModOptions}
                            onChange={e => setNewModOptions(e.target.value)}
                            placeholder="Options: Whole, Oat, Almond"
                            className="w-full px-2.5 py-1.5 rounded-md bg-stone-800 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={() => addModifier(btn.id)}
                            disabled={!newModLabel.trim()}
                            className="w-full py-2 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-40 text-stone-200 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus size={13} /> Add Line
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          <button
            onClick={addButton}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-stone-600 hover:border-amber-500 text-stone-500 hover:text-amber-400 flex items-center justify-center gap-2 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Add Button
          </button>
        </div>
      </div>
    </div>
  );
}
