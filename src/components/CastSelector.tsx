"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, ChevronDown, Check, Loader2 } from "lucide-react";
import type { Character } from "@/hooks/useProject";

interface CastSelectorProps {
  characters: Character[];
  selectedIds: Set<string>;
  onToggle: (characterId: string) => void;
  onAddCharacter?: (name: string) => Promise<void>;
  disabled?: boolean;
}

export function CastSelector({
  characters,
  selectedIds,
  onToggle,
  onAddCharacter,
  disabled = false,
}: CastSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCharacters = characters.filter((c) => selectedIds.has(c.id));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!newCharacterName.trim() || isCreating || !onAddCharacter) return;

    setIsCreating(true);
    try {
      await onAddCharacter(newCharacterName.trim());
      setNewCharacterName("");
    } catch (error) {
      console.error("Failed to create character:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-stone-400">Cast</label>
      </div>

      {/* Selected characters display / trigger button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full min-h-[42px] px-3 py-2 bg-stone-800 border border-stone-700 rounded text-left text-sm transition-colors flex items-center gap-2 ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-stone-600 focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer"
        }`}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selectedCharacters.length === 0 ? (
            <span className="text-stone-500">Select cast members...</span>
          ) : (
            selectedCharacters
              .sort((a, b) => a.number - b.number)
              .map((character) => (
                <span
                  key={character.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold/20 text-gold rounded text-xs"
                >
                  #{character.number} {character.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(character.id);
                    }}
                    className="hover:text-gold-light"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-stone-800 border border-stone-700 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Add new character input */}
          {onAddCharacter && (
            <div className="p-2 border-b border-stone-700">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add new character..."
                  className="flex-1 px-3 py-1.5 bg-stone-900 border border-stone-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating || !newCharacterName.trim()}
                  className="px-3 py-1.5 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded text-sm transition-colors disabled:opacity-50 flex items-center"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Character list */}
          <div className="max-h-48 overflow-y-auto">
            {characters.length === 0 ? (
              <div className="p-3 text-center text-stone-500 text-sm">
                No characters yet. Add one above.
              </div>
            ) : (
              characters
                .sort((a, b) => a.number - b.number)
                .map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => onToggle(character.id)}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-stone-700 text-left text-sm"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedIds.has(character.id)
                          ? "bg-gold border-gold"
                          : "border-stone-600"
                      }`}
                    >
                      {selectedIds.has(character.id) && (
                        <Check className="w-3 h-3 text-stone-950" />
                      )}
                    </div>
                    <span className="text-gold font-mono text-xs">#{character.number}</span>
                    <span className="text-white flex-1">{character.name}</span>
                    {character.actor && (
                      <span className="text-stone-500 text-xs truncate max-w-32">
                        ({character.actor})
                      </span>
                    )}
                  </button>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
