"use client";

import { useState, useEffect } from "react";
import type { BreakdownSheet, Character, ProductionElement, ElementCategory } from "@/hooks/useProject";
import { Plus, ChevronRight, X, Trash2, Check, Loader2 } from "lucide-react";
import { ElementSelector } from "./ElementSelector";
import { CastSelector } from "./CastSelector";

interface BreakdownsTabProps {
  breakdowns: BreakdownSheet[];
  characters: Character[];
  elements: ProductionElement[];
  canEdit: boolean;
  onCreate: (data: Partial<BreakdownSheet> & { castIds?: string[]; elementIds?: string[] }) => Promise<void>;
  onUpdate: (bdId: string, data: Partial<BreakdownSheet> & { castIds?: string[]; elementIds?: string[] }) => Promise<void>;
  onDelete: (bdId: string) => Promise<void>;
  onAddCharacter?: (name: string, actor?: string) => Promise<void>;
  onCreateElement?: (category: ElementCategory, name: string) => Promise<ProductionElement | undefined>;
}

// Department fields with their category enum values
const DEPARTMENT_FIELDS: { key: string; label: string; category: ElementCategory }[] = [
  { key: "wardrobe", label: "Wardrobe", category: "WARDROBE" },
  { key: "props", label: "Props", category: "PROPS" },
  { key: "setDressing", label: "Set Dressing", category: "SET_DRESSING" },
  { key: "artDept", label: "Art Department", category: "ART_DEPT" },
  { key: "specialPersonnel", label: "Special Personnel", category: "SPECIAL_PERSONNEL" },
  { key: "vehicles", label: "Vehicles", category: "VEHICLES" },
  { key: "camera", label: "Camera", category: "CAMERA" },
  { key: "mechanicalFx", label: "Mechanical FX", category: "MECHANICAL_FX" },
  { key: "visualFx", label: "Visual FX", category: "VISUAL_FX" },
  { key: "specialEquip", label: "Special Equipment", category: "SPECIAL_EQUIP" },
  { key: "animals", label: "Animals", category: "ANIMALS" },
  { key: "soundMusic", label: "Sound/Music", category: "SOUND_MUSIC" },
  { key: "other", label: "Other", category: "OTHER" },
];

// DQs/Notes stays as free text (no element selector)
const DQS_FIELD = { key: "dqs", label: "DQs/Notes" };

function BreakdownForm({
  breakdown,
  characters,
  elements,
  onSave,
  onCancel,
  onDelete,
  onAddCharacter,
  onCreateElement,
}: {
  breakdown?: BreakdownSheet;
  characters: Character[];
  elements: ProductionElement[];
  onSave: (data: Partial<BreakdownSheet> & { castIds?: string[]; elementIds?: string[] }) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  onAddCharacter?: (name: string, actor?: string) => Promise<void>;
  onCreateElement?: (category: ElementCategory, name: string) => Promise<ProductionElement | undefined>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [form, setForm] = useState({
    sceneNumbers: breakdown?.sceneNumbers || "",
    intExt: breakdown?.intExt || "",
    location: breakdown?.location || "",
    dayNight: breakdown?.dayNight || "",
    pageCount: breakdown?.pageCount || "",
    description: breakdown?.description || "",
    storyDay: breakdown?.storyDay?.toString() || "",
    isFlashback: breakdown?.isFlashback || false,
    stunts: breakdown?.stunts || "",
    extras: breakdown?.extras || "",
    wardrobe: breakdown?.wardrobe || "",
    props: breakdown?.props || "",
    setDressing: breakdown?.setDressing || "",
    artDept: breakdown?.artDept || "",
    specialPersonnel: breakdown?.specialPersonnel || "",
    vehicles: breakdown?.vehicles || "",
    camera: breakdown?.camera || "",
    mechanicalFx: breakdown?.mechanicalFx || "",
    visualFx: breakdown?.visualFx || "",
    specialEquip: breakdown?.specialEquip || "",
    animals: breakdown?.animals || "",
    soundMusic: breakdown?.soundMusic || "",
    other: breakdown?.other || "",
    dqs: breakdown?.dqs || "",
  });
  const [selectedCast, setSelectedCast] = useState<Set<string>>(
    new Set(breakdown?.cast.map((c) => c.characterId) || [])
  );

  // Selected elements (from element library)
  const [selectedElements, setSelectedElements] = useState<Set<string>>(
    new Set(breakdown?.elements?.map((e) => e.elementId) || [])
  );

  // Reset save status after showing "Saved!"
  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 1500);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sceneNumbers.trim()) return;

    setIsSaving(true);
    setSaveStatus("saving");
    try {
      await onSave({
        ...form,
        intExt: form.intExt as "INT" | "EXT" | undefined || undefined,
        dayNight: form.dayNight as BreakdownSheet["dayNight"] || undefined,
        storyDay: form.storyDay ? parseInt(form.storyDay, 10) : undefined,
        castIds: Array.from(selectedCast),
        elementIds: Array.from(selectedElements),
      });
      setSaveStatus("saved");
      // Don't close the form immediately - let user see "Saved!"
      setTimeout(() => onCancel(), 800);
    } catch (error) {
      console.error("Failed to save breakdown:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCast = (charId: string) => {
    const newSet = new Set(selectedCast);
    if (newSet.has(charId)) {
      newSet.delete(charId);
    } else {
      newSet.add(charId);
    }
    setSelectedCast(newSet);
  };

  const toggleElement = (elementId: string) => {
    const newSet = new Set(selectedElements);
    if (newSet.has(elementId)) {
      newSet.delete(elementId);
    } else {
      newSet.add(elementId);
    }
    setSelectedElements(newSet);
  };

  const getSaveButtonContent = () => {
    if (saveStatus === "saving") {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </>
      );
    }
    if (saveStatus === "saved") {
      return (
        <>
          <Check className="w-4 h-4" />
          Saved!
        </>
      );
    }
    return breakdown ? "Update" : "Create";
  };

  const getSaveButtonClass = () => {
    if (saveStatus === "saved") {
      return "px-6 py-2 bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2";
    }
    return "px-6 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2";
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-display text-gold">
          {breakdown ? "Edit Breakdown" : "New Breakdown"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-stone-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scene Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Scene #</label>
          <input
            type="text"
            value={form.sceneNumbers}
            onChange={(e) => setForm({ ...form, sceneNumbers: e.target.value })}
            placeholder="1, 2A, 3-4"
            required
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">INT/EXT</label>
          <select
            value={form.intExt}
            onChange={(e) => setForm({ ...form, intExt: e.target.value })}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">—</option>
            <option value="INT">INT</option>
            <option value="EXT">EXT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Day/Night</label>
          <select
            value={form.dayNight}
            onChange={(e) => setForm({ ...form, dayNight: e.target.value })}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">—</option>
            <option value="DAY">Day</option>
            <option value="NIGHT">Night</option>
            <option value="DUSK">Dusk</option>
            <option value="DAWN">Dawn</option>
            <option value="DAY_FOR_NIGHT">Day for Night</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Page Count</label>
          <input
            type="text"
            value={form.pageCount}
            onChange={(e) => setForm({ ...form, pageCount: e.target.value })}
            placeholder="3/8"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Location name"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm text-stone-400 mb-1">Story Day</label>
            <input
              type="number"
              value={form.storyDay}
              onChange={(e) => setForm({ ...form, storyDay: e.target.value })}
              min="1"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <label className="flex items-center gap-2 mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFlashback}
              onChange={(e) => setForm({ ...form, isFlashback: e.target.checked })}
              className="w-4 h-4 rounded border-stone-700 bg-stone-800 text-gold focus:ring-gold"
            />
            <span className="text-sm text-stone-400">Flashback</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm text-stone-400 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
        />
      </div>

      {/* Cast Selection with Dropdown */}
      <CastSelector
        characters={characters}
        selectedIds={selectedCast}
        onToggle={toggleCast}
        onAddCharacter={onAddCharacter ? async (name) => {
          await onAddCharacter(name);
        } : undefined}
      />

      {/* Stunts & Extras */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Stunts</label>
          <textarea
            value={form.stunts}
            onChange={(e) => setForm({ ...form, stunts: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Extras</label>
          <textarea
            value={form.extras}
            onChange={(e) => setForm({ ...form, extras: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
        </div>
      </div>

      {/* Department Fields - Element Selectors */}
      <details className="group" open>
        <summary className="cursor-pointer text-sm text-stone-400 hover:text-stone-300">
          Department Details
        </summary>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {DEPARTMENT_FIELDS.map(({ label, category }) => (
            <ElementSelector
              key={category}
              category={category}
              label={label}
              elements={elements}
              selectedIds={selectedElements}
              onToggle={toggleElement}
              onCreate={async (name) => {
                if (onCreateElement) {
                  return onCreateElement(category, name);
                }
                return undefined;
              }}
              disabled={!onCreateElement}
            />
          ))}
        </div>

        {/* DQs/Notes stays as free text */}
        <div className="mt-4">
          <label className="block text-sm text-stone-400 mb-1">{DQS_FIELD.label}</label>
          <textarea
            value={form.dqs}
            onChange={(e) => setForm({ ...form, dqs: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            placeholder="Day Qualified Stunt performers, notes..."
          />
        </div>
      </details>

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-stone-800">
        <button
          type="submit"
          disabled={isSaving || !form.sceneNumbers.trim()}
          className={getSaveButtonClass()}
        >
          {getSaveButtonContent()}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-stone-400 hover:text-white"
        >
          Cancel
        </button>
        {breakdown && onDelete && (
          <button
            type="button"
            onClick={async () => {
              if (confirm(`Delete scene ${breakdown.sceneNumbers}?`)) {
                await onDelete();
                onCancel();
              }
            }}
            className="ml-auto px-4 py-2 text-red-400 hover:text-red-300 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function getStripColor(intExt: string | null, dayNight: string | null): string {
  if (dayNight === "DAY" || dayNight === "DAWN" || dayNight === "DUSK") {
    return intExt === "EXT" ? "bg-yellow-300" : "bg-white";
  }
  if (dayNight === "NIGHT" || dayNight === "DAY_FOR_NIGHT") {
    return intExt === "EXT" ? "bg-green-300" : "bg-blue-300";
  }
  return "bg-stone-300";
}

export function BreakdownsTab({
  breakdowns,
  characters,
  elements,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
  onAddCharacter,
  onCreateElement,
}: BreakdownsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingBreakdown = editingId
    ? breakdowns.find((b) => b.id === editingId)
    : undefined;

  if (showForm || editingId) {
    return (
      <div className="max-w-4xl">
        <BreakdownForm
          breakdown={editingBreakdown}
          characters={characters}
          elements={elements}
          onSave={async (data) => {
            if (editingId) {
              await onUpdate(editingId, data);
            } else {
              await onCreate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onDelete={editingId ? async () => {
            await onDelete(editingId);
            setEditingId(null);
          } : undefined}
          onAddCharacter={onAddCharacter}
          onCreateElement={onCreateElement}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display text-gold">Breakdown Sheets</h2>
          <p className="text-stone-500 text-sm mt-1">
            {breakdowns.length} scene{breakdowns.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Breakdown
          </button>
        )}
      </div>

      {breakdowns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-500">No breakdown sheets yet.</p>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-gold hover:text-gold-light"
            >
              Create your first breakdown
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {breakdowns.map((breakdown) => (
            <button
              key={breakdown.id}
              onClick={() => canEdit && setEditingId(breakdown.id)}
              className="w-full flex items-center gap-4 p-4 bg-stone-900 border border-stone-800 rounded-lg hover:border-stone-700 transition-colors text-left group"
            >
              {/* Color indicator */}
              <div
                className={`w-2 h-12 rounded ${getStripColor(
                  breakdown.intExt,
                  breakdown.dayNight
                )}`}
              />

              {/* Scene info */}
              <div className="w-20 font-mono text-lg text-white">
                {breakdown.sceneNumbers}
              </div>

              {/* INT/EXT & Day/Night */}
              <div className="w-24 text-sm text-stone-400">
                {breakdown.intExt || "—"} / {breakdown.dayNight?.replace("_", " ") || "—"}
              </div>

              {/* Location */}
              <div className="flex-1 text-white truncate">
                {breakdown.location || "—"}
              </div>

              {/* Page count */}
              <div className="w-16 font-mono text-sm text-stone-400 text-right">
                {breakdown.pageCount || "—"}
              </div>

              {/* Cast count */}
              <div className="w-16 text-sm text-stone-500">
                {breakdown.cast.length} cast
              </div>

              {canEdit && (
                <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-stone-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
