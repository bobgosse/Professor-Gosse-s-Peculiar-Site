"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, ChevronDown, Check, Loader2 } from "lucide-react";
import type { ProductionElement, ElementCategory } from "@/hooks/useProject";

interface ElementSelectorProps {
  category: ElementCategory;
  label: string;
  elements: ProductionElement[];
  selectedIds: Set<string>;
  onToggle: (elementId: string) => void;
  onCreate: (name: string) => Promise<ProductionElement | undefined>;
  disabled?: boolean;
}

export function ElementSelector({
  category,
  label,
  elements,
  selectedIds,
  onToggle,
  onCreate,
  disabled = false,
}: ElementSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newElementName, setNewElementName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter elements for this category
  const categoryElements = elements.filter((e) => e.category === category);
  const selectedElements = categoryElements.filter((e) => selectedIds.has(e.id));

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
    if (!newElementName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newElement = await onCreate(newElementName.trim());
      if (newElement) {
        onToggle(newElement.id); // Auto-select newly created element
      }
      setNewElementName("");
    } catch (error) {
      console.error("Failed to create element:", error);
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
      <label className="block text-sm text-stone-400 mb-1">{label}</label>

      {/* Selected elements display / trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[42px] px-3 py-2 bg-stone-800 border border-stone-700 rounded text-left text-sm transition-colors flex items-center gap-2 ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-stone-600 focus:outline-none focus:ring-2 focus:ring-gold"
        }`}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selectedElements.length === 0 ? (
            <span className="text-stone-500">Select {label.toLowerCase()}...</span>
          ) : (
            selectedElements.map((element) => (
              <span
                key={element.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold/20 text-gold rounded text-xs"
              >
                {element.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(element.id);
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
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-stone-800 border border-stone-700 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Add new element input */}
          <div className="p-2 border-b border-stone-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newElementName}
                onChange={(e) => setNewElementName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Add new ${label.toLowerCase()}...`}
                className="flex-1 px-3 py-1.5 bg-stone-900 border border-stone-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !newElementName.trim()}
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

          {/* Element list */}
          <div className="max-h-48 overflow-y-auto">
            {categoryElements.length === 0 ? (
              <div className="p-3 text-center text-stone-500 text-sm">
                No {label.toLowerCase()} yet. Add one above.
              </div>
            ) : (
              categoryElements.map((element) => (
                <button
                  key={element.id}
                  type="button"
                  onClick={() => onToggle(element.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-stone-700 text-left text-sm"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedIds.has(element.id)
                        ? "bg-gold border-gold"
                        : "border-stone-600"
                    }`}
                  >
                    {selectedIds.has(element.id) && (
                      <Check className="w-3 h-3 text-stone-950" />
                    )}
                  </div>
                  <span className="text-white flex-1">{element.name}</span>
                  {element.notes && (
                    <span className="text-stone-500 text-xs truncate max-w-32">
                      {element.notes}
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
