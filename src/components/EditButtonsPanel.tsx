import { useState, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, Upload, ChevronDown, ChevronUp, Image } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db, DrinkButton, ButtonModifier } from '../lib/supabase';

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

interface SortableButtonRowProps {
  btn: DrinkButton;
  modifiers: ButtonModifier[];
  editingId: string | null;
  editLabel: string;
  editColor: string;
  editImageUrl: string;
  editIsToggle: boolean;
  uploading: boolean;
  expandedModifiers: string | null;
  newModLabel: string;
  newModOptions: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onStartEdit: (btn: DrinkButton) => void;
  onSaveEdit: (btn: DrinkButton) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onToggleModifiers: (id: string) => void;
  onEditLabel: (v: string) => void;
  onEditColor: (v: string) => void;
  onEditImageUrl: (v: string) => void;
  onEditIsToggle: (v: boolean) => void;
  onUploadClick: () => void;
  onAddModifier: (buttonId: string) => void;
  onDeleteModifier: (id: string) => void;
  onUpdateModifierOptions: (mod: ButtonModifier, raw: string) => void;
  onNewModLabel: (v: string) => void;
  onNewModOptions: (v: string) => void;
}

function SortableButtonRow({
  btn,
  modifiers,
  editingId,
  editLabel,
  editColor,
  editImageUrl,
  editIsToggle,
  uploading,
  expandedModifiers,
  newModLabel,
  newModOptions,
  fileInputRef,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleModifiers,
  onEditLabel,
  onEditColor,
  onEditImageUrl,
  onEditIsToggle,
  onUploadClick,
  onAddModifier,
  onDeleteModifier,
  onUpdateModifierOptions,
  onNewModLabel,
  onNewModOptions,
}: SortableButtonRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: btn.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const btnModifiers = modifiers.filter(m => m.button_id === btn.id).sort((a, b) => a.display_order - b.display_order);
  const isEditing = editingId === btn.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl bg-stone-800 border overflow-hidden transition-shadow ${isDragging ? 'border-amber-500 shadow-lg shadow-amber-900/30' : 'border-stone-700'}`}
    >
      {isEditing ? (
        <div className="p-4 space-y-4">
          {/* Label */}
          <div>
            <label className="text-xs font-medium text-stone-400 uppercase tracking-wider block mb-1.5">Label</label>
            <input
              type="text"
              value={editLabel}
              onChange={e => onEditLabel(e.target.value)}
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
                  onClick={() => onEditColor(c)}
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
                onChange={e => onEditColor(e.target.value)}
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
                    onClick={() => onEditImageUrl('')}
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
                  onChange={e => onEditImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-stone-700 border border-stone-600 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Paste image URL..."
                />
                <button
                  onClick={onUploadClick}
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
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-stone-200">Quick tap (no modifiers)</p>
              <p className="text-xs text-stone-500">Records sale immediately on tap</p>
            </div>
            <button
              onClick={() => onEditIsToggle(!editIsToggle)}
              className={`relative w-11 h-6 rounded-full transition-colors ${editIsToggle ? 'bg-amber-600' : 'bg-stone-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${editIsToggle ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onSaveEdit(btn)}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
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
            <button
              className="touch-none cursor-grab active:cursor-grabbing p-1 rounded text-stone-500 hover:text-stone-300 transition-colors shrink-0"
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
            >
              <GripVertical size={16} />
            </button>
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
              onClick={() => onStartEdit(btn)}
              className="px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onToggleModifiers(btn.id)}
              className="p-1.5 rounded-lg hover:bg-stone-700 text-stone-500 hover:text-stone-300 transition-colors"
            >
              {expandedModifiers === btn.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => onDelete(btn.id)}
              className="p-1.5 rounded-lg hover:bg-red-900/40 text-stone-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Modifier section */}
          {expandedModifiers === btn.id && (
            <div className="border-t border-stone-700 p-4 space-y-3 bg-stone-900/60">
              <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Modifier Options</h4>

              {btnModifiers.length > 0 && (
                <div className="space-y-2">
                  {btnModifiers.map(mod => (
                    <div key={mod.id} className="rounded-lg bg-stone-800 border border-stone-700 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-stone-200">{mod.label}</span>
                        <button
                          onClick={() => onDeleteModifier(mod.id)}
                          className="p-1 rounded hover:bg-red-900/40 text-stone-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <input
                        type="text"
                        defaultValue={mod.options.join(', ')}
                        onBlur={e => onUpdateModifierOptions(mod, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md bg-stone-700 border border-stone-600 text-stone-300 text-xs focus:outline-none focus:border-amber-500"
                        placeholder="Option 1, Option 2, Option 3"
                      />
                      <p className="text-xs text-stone-600 mt-1">Comma-separated options</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed border-stone-600 p-3 space-y-2">
                <p className="text-xs text-stone-500 font-medium">Add modifier line</p>
                <input
                  type="text"
                  value={newModLabel}
                  onChange={e => onNewModLabel(e.target.value)}
                  placeholder="Line label (e.g. Milk Type)"
                  className="w-full px-2.5 py-1.5 rounded-md bg-stone-800 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={newModOptions}
                  onChange={e => onNewModOptions(e.target.value)}
                  placeholder="Options: Whole, Oat, Almond"
                  className="w-full px-2.5 py-1.5 rounded-md bg-stone-800 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => onAddModifier(btn.id)}
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function startEdit(btn: DrinkButton) {
    setEditingId(btn.id);
    setEditLabel(btn.label);
    setEditColor(btn.color);
    setEditImageUrl(btn.image_url ?? '');
    setEditIsToggle(btn.is_toggle);
  }

  async function saveEdit(btn: DrinkButton) {
    await db.update('drink_buttons', [{ column: 'id', value: btn.id }], {
      label: editLabel.trim() || btn.label,
      color: editColor,
      image_url: editImageUrl.trim() || null,
      is_toggle: editIsToggle,
    });
    setEditingId(null);
    onButtonsChange();
  }

  async function deleteButton(id: string) {
    await db.delete('drink_buttons', [{ column: 'id', value: id }]);
    onButtonsChange();
    onModifiersChange();
  }

  async function addButton() {
    const maxOrder = buttons.reduce((m, b) => Math.max(m, b.display_order), 0);
    await db.insert('drink_buttons', {
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
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    const { data: uploadData, error: uploadError } = await db.upload('button-images', filename, fileBytes, file.type);
    if (!uploadError && uploadData) {
      setEditImageUrl(uploadData.publicUrl);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function addModifier(buttonId: string) {
    if (!newModLabel.trim()) return;
    const options = newModOptions.split(',').map(o => o.trim()).filter(Boolean);
    const existing = modifiers.filter(m => m.button_id === buttonId);
    await db.insert('button_modifiers', {
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
    await db.delete('button_modifiers', [{ column: 'id', value: id }]);
    onModifiersChange();
  }

  async function updateModifierOptions(modifier: ButtonModifier, rawOptions: string) {
    const options = rawOptions.split(',').map(o => o.trim()).filter(Boolean);
    await db.update('button_modifiers', [{ column: 'id', value: modifier.id }], { options });
    onModifiersChange();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = buttons.findIndex(b => b.id === active.id);
    const newIndex = buttons.findIndex(b => b.id === over.id);
    const reordered = arrayMove(buttons, oldIndex, newIndex);

    // Persist new display_order values — update only changed rows
    const updates = reordered
      .map((btn, i) => ({ id: btn.id, display_order: i }))
      .filter((u, i) => buttons[i]?.id !== u.id);

    await Promise.all(
      updates.map(u => db.update('drink_buttons', [{ column: 'id', value: u.id }], { display_order: u.display_order }))
    );

    onButtonsChange();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-stone-900 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-700">
          <div>
            <h2 className="text-xl font-semibold text-stone-100">Edit Buttons</h2>
            <p className="text-xs text-stone-500 mt-0.5">Drag the grip handle to reorder</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={buttons.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {buttons.map(btn => (
                <SortableButtonRow
                  key={btn.id}
                  btn={btn}
                  modifiers={modifiers}
                  editingId={editingId}
                  editLabel={editLabel}
                  editColor={editColor}
                  editImageUrl={editImageUrl}
                  editIsToggle={editIsToggle}
                  uploading={uploading}
                  expandedModifiers={expandedModifiers}
                  newModLabel={newModLabel}
                  newModOptions={newModOptions}
                  fileInputRef={fileInputRef}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={deleteButton}
                  onToggleModifiers={id => setExpandedModifiers(expandedModifiers === id ? null : id)}
                  onEditLabel={setEditLabel}
                  onEditColor={setEditColor}
                  onEditImageUrl={setEditImageUrl}
                  onEditIsToggle={setEditIsToggle}
                  onUploadClick={() => fileInputRef.current?.click()}
                  onAddModifier={addModifier}
                  onDeleteModifier={deleteModifier}
                  onUpdateModifierOptions={updateModifierOptions}
                  onNewModLabel={setNewModLabel}
                  onNewModOptions={setNewModOptions}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={addButton}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-stone-600 hover:border-amber-500 text-stone-500 hover:text-amber-400 flex items-center justify-center gap-2 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Add Button
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
