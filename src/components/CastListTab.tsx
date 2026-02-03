"use client";

import { useState } from "react";
import type { Character } from "@/hooks/useProject";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface CastListTabProps {
  characters: Character[];
  canEdit: boolean;
  onAdd: (name: string, actor?: string) => Promise<void>;
  onUpdate: (charId: string, updates: { name?: string; actor?: string }) => Promise<void>;
  onDelete: (charId: string) => Promise<void>;
  onReorder: (characterIds: string[]) => Promise<void>;
}

function SortableCharacter({
  character,
  canEdit,
  onUpdate,
  onDelete,
}: {
  character: Character;
  canEdit: boolean;
  onUpdate: (charId: string, updates: { name?: string; actor?: string }) => Promise<void>;
  onDelete: (charId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(character.name);
  const [actor, setActor] = useState(character.actor || "");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: character.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    await onUpdate(character.id, { name, actor: actor || undefined });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(character.name);
    setActor(character.actor || "");
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-stone-900 border border-stone-800 rounded-lg group"
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-stone-600 hover:text-stone-400"
        >
          <GripVertical className="w-5 h-5" />
        </button>
      )}

      <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-mono font-bold">
        {character.number}
      </div>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            autoFocus
          />
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Actor name"
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button
            onClick={handleSave}
            className="p-2 text-green-500 hover:text-green-400"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-2 text-stone-500 hover:text-stone-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <p className="text-white font-medium">{character.name}</p>
            {character.actor && (
              <p className="text-stone-500 text-sm">{character.actor}</p>
            )}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-stone-500 hover:text-white"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${character.name}"?`)) {
                    onDelete(character.id);
                  }
                }}
                className="p-2 text-stone-500 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CastListTab({
  characters,
  canEdit,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: CastListTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newActor, setNewActor] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = characters.findIndex((c) => c.id === active.id);
      const newIndex = characters.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(characters, oldIndex, newIndex);
      await onReorder(newOrder.map((c) => c.id));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(newName.trim(), newActor.trim() || undefined);
      setNewName("");
      setNewActor("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add character:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display text-gold">Cast List</h2>
          <p className="text-stone-500 text-sm mt-1">
            {characters.length} character{characters.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Character
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="mb-6 p-4 bg-stone-900 border border-stone-800 rounded-lg"
        >
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Character name"
              autoFocus
              className="flex-1 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <input
              type="text"
              value={newActor}
              onChange={(e) => setNewActor(e.target.value)}
              placeholder="Actor name (optional)"
              className="flex-1 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              disabled={isAdding || !newName.trim()}
              className="px-6 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isAdding ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setNewActor("");
              }}
              className="px-4 py-2 text-stone-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Character List */}
      {characters.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-500">No characters yet.</p>
          {canEdit && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-gold hover:text-gold-light"
            >
              Add your first character
            </button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={characters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {characters.map((character) => (
                <SortableCharacter
                  key={character.id}
                  character={character}
                  canEdit={canEdit}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {canEdit && characters.length > 0 && (
        <p className="mt-4 text-stone-600 text-sm">
          Drag characters to reorder. Numbers indicate cast importance.
        </p>
      )}
    </div>
  );
}
