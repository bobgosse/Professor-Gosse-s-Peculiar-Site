"use client";

import { useState, useMemo } from "react";
import type { Schedule, StripSlot, DayBreak } from "@/hooks/useSchedule";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, List, Calendar } from "lucide-react";
import { ProductionCalendar } from "./ProductionCalendar";

interface StripBoardTabProps {
  schedule: Schedule | undefined;
  canEdit: boolean;
  onReorder: (stripId: string, newPosition: number) => Promise<void>;
  onToggleDayBreak: (afterPosition: number) => Promise<{ action: "created" | "deleted"; dayBreak: DayBreak } | undefined>;
  onRenumberDayBreaks: () => Promise<void>;
  onUpdateStartDate?: (date: string | null) => Promise<void>;
}

type ViewMode = "strips" | "calendar";

function getStripColorClass(intExt: string | null, dayNight: string | null): string {
  if (dayNight === "DAY" || dayNight === "DAWN" || dayNight === "DUSK") {
    return intExt === "EXT" ? "strip-day-ext" : "strip-day-int";
  }
  if (dayNight === "NIGHT" || dayNight === "DAY_FOR_NIGHT") {
    return intExt === "EXT" ? "strip-night-ext" : "strip-night-int";
  }
  return "bg-stone-300 text-stone-900";
}

function SortableStrip({
  strip,
  canEdit,
}: {
  strip: StripSlot;
  canEdit: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: strip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorClass = getStripColorClass(
    strip.breakdown.intExt,
    strip.breakdown.dayNight
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch rounded overflow-hidden ${colorClass}`}
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="px-2 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <div className="flex-1 flex items-center gap-4 px-3 py-2 text-sm">
        {/* Scene Number */}
        <div className="w-12 font-mono font-bold">
          {strip.breakdown.sceneNumbers}
        </div>

        {/* INT/EXT */}
        <div className="w-8 text-xs font-medium">
          {strip.breakdown.intExt || "—"}
        </div>

        {/* Day/Night */}
        <div className="w-8 text-xs">
          {strip.breakdown.dayNight?.charAt(0) || "—"}
        </div>

        {/* Location */}
        <div className="flex-1 truncate font-medium">
          {strip.breakdown.location || "—"}
        </div>

        {/* Description */}
        <div className="flex-1 truncate text-xs opacity-75">
          {strip.breakdown.description || ""}
        </div>

        {/* Page Count */}
        <div className="w-12 font-mono text-right">
          {strip.breakdown.pageCount || "—"}
        </div>

        {/* Cast Numbers */}
        <div className="w-24 text-xs">
          {strip.breakdown.cast
            .map((c) => c.character.number)
            .sort((a, b) => a - b)
            .join(", ") || "—"}
        </div>
      </div>
    </div>
  );
}

function DayBreakStrip({
  dayBreak,
  totalPages,
  shootDate,
}: {
  dayBreak: DayBreak;
  totalPages: string;
  shootDate?: string;
}) {
  return (
    <div className="strip-day-break rounded px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-bold">END OF DAY {dayBreak.dayNumber}</span>
        {shootDate && (
          <span className="text-sm opacity-75">— {shootDate}</span>
        )}
      </div>
      <span className="font-mono">{totalPages} pages</span>
    </div>
  );
}

function parsePageCount(pageCount: string | null): number {
  if (!pageCount) return 0;
  // Handle formats like "3/8", "1 2/8", "1", etc.
  const parts = pageCount.trim().split(" ");
  let total = 0;
  for (const part of parts) {
    if (part.includes("/")) {
      const [num, denom] = part.split("/").map(Number);
      total += num / denom;
    } else {
      total += Number(part) || 0;
    }
  }
  return total;
}

function formatPageCount(pages: number): string {
  const whole = Math.floor(pages);
  const fraction = pages - whole;
  const eighths = Math.round(fraction * 8);

  if (eighths === 0) return whole.toString();
  if (whole === 0) return `${eighths}/8`;
  return `${whole} ${eighths}/8`;
}

function formatShootDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Parse date string as local date (not UTC) to avoid timezone offset issues
function parseLocalDate(dateStr: string): Date {
  // If the date is ISO format like "2026-02-03T00:00:00.000Z", extract just the date part
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  // Create date at noon local time to avoid any DST/timezone boundary issues
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function StripBoardTab({
  schedule,
  canEdit,
  onReorder,
  onToggleDayBreak,
  onRenumberDayBreaks,
  onUpdateStartDate,
}: StripBoardTabProps) {
  const [isReordering, setIsReordering] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("strips");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate shoot dates for each day break based on startDate
  const shootDateMap = useMemo(() => {
    const map = new Map<number, string>();
    if (!schedule?.startDate) return map;

    const startDate = parseLocalDate(schedule.startDate);
    const sortedDayBreaks = [...(schedule.dayBreaks || [])].sort((a, b) => a.dayNumber - b.dayNumber);

    sortedDayBreaks.forEach((db) => {
      // Day 1 ends on startDate, Day 2 ends on startDate + 1, etc.
      const shootDate = addDays(startDate, db.dayNumber - 1);
      map.set(db.dayNumber, formatShootDate(shootDate));
    });

    return map;
  }, [schedule?.startDate, schedule?.dayBreaks]);

  if (!schedule) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <p className="text-stone-500">Loading schedule...</p>
        </div>
      </div>
    );
  }

  const strips = schedule.stripSlots;
  const dayBreaks = schedule.dayBreaks;

  // Create a map of day breaks by afterPosition
  const dayBreakMap = new Map<number, DayBreak>();
  dayBreaks.forEach((db) => dayBreakMap.set(db.afterPosition, db));

  // Calculate pages per day - includes all strips from startPos+1 to endPos
  const calculatePagesForDay = (startPos: number, endPos: number): number => {
    return strips
      .filter((s) => s.position > startPos && s.position <= endPos)
      .reduce((sum, s) => sum + parsePageCount(s.breakdown.pageCount), 0);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setIsReordering(true);
      try {
        const activeStrip = strips.find((s) => s.id === active.id);
        const overStrip = strips.find((s) => s.id === over.id);
        if (activeStrip && overStrip) {
          await onReorder(activeStrip.id, overStrip.position);
        }
      } finally {
        setIsReordering(false);
      }
    }
  };

  const handleToggleDayBreak = async (afterPosition: number) => {
    await onToggleDayBreak(afterPosition);
    // Auto-renumber after toggling
    await onRenumberDayBreaks();
  };

  // Build the interleaved list of strips and day breaks
  const renderSchedule = () => {
    const elements: React.ReactNode[] = [];
    let lastDayBreakPos = 0;

    strips.forEach((strip, index) => {
      // Add the strip first
      elements.push(
        <SortableStrip
          key={strip.id}
          strip={strip}
          canEdit={canEdit && !isReordering}
        />
      );

      // Check for day break after this strip
      const dayBreak = dayBreakMap.get(strip.position);
      if (dayBreak) {
        const pages = calculatePagesForDay(lastDayBreakPos, strip.position);
        elements.push(
          <DayBreakStrip
            key={`db-${dayBreak.id}`}
            dayBreak={dayBreak}
            totalPages={formatPageCount(pages)}
            shootDate={shootDateMap.get(dayBreak.dayNumber)}
          />
        );
        lastDayBreakPos = strip.position;
      }

      // Day break toggle button (after every strip, including the last one)
      if (canEdit) {
        const hasBreak = dayBreakMap.has(strip.position);
        elements.push(
          <button
            key={`toggle-${strip.position}`}
            onClick={() => handleToggleDayBreak(strip.position)}
            className={`w-full py-1 text-xs transition-colors ${
              hasBreak
                ? "text-red-400 hover:text-red-300"
                : "text-stone-700 hover:text-stone-500"
            }`}
          >
            {hasBreak ? "Remove day break" : <Plus className="w-3 h-3 mx-auto" />}
          </button>
        );
      }
    });

    return elements;
  };

  // Calculate total pages
  const totalPages = strips.reduce(
    (sum, s) => sum + parsePageCount(s.breakdown.pageCount),
    0
  );

  // Calculate days
  const totalDays = dayBreaks.length + (strips.length > 0 ? 1 : 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display text-gold">Strip Board</h2>
          <p className="text-stone-500 text-sm mt-1">
            {strips.length} scene{strips.length !== 1 ? "s" : ""} •{" "}
            {formatPageCount(totalPages)} pages • {totalDays} day{totalDays !== 1 ? "s" : ""}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-stone-900 rounded-lg p-1">
          <button
            onClick={() => setViewMode("strips")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "strips"
                ? "bg-gold text-stone-950"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <List className="w-4 h-4" />
            Strips
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-gold text-stone-950"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        onUpdateStartDate ? (
          <ProductionCalendar
            schedule={schedule}
            canEdit={canEdit}
            onUpdateStartDate={onUpdateStartDate}
          />
        ) : (
          <div className="text-center py-16">
            <p className="text-stone-500">Calendar view is not available.</p>
          </div>
        )
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded strip-day-ext" />
              <span className="text-stone-400">Day/EXT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded strip-day-int" />
              <span className="text-stone-400">Day/INT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded strip-night-ext" />
              <span className="text-stone-400">Night/EXT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded strip-night-int" />
              <span className="text-stone-400">Night/INT</span>
            </div>
          </div>

          {/* Header Row */}
          <div className="flex items-center gap-4 px-3 py-2 text-xs text-stone-500 font-medium border-b border-stone-800 mb-2">
            {canEdit && <div className="w-6" />}
            <div className="w-12">Scene</div>
            <div className="w-8">I/E</div>
            <div className="w-8">D/N</div>
            <div className="flex-1">Location</div>
            <div className="flex-1">Description</div>
            <div className="w-12 text-right">Pages</div>
            <div className="w-24">Cast</div>
          </div>

          {strips.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-500">
                No scenes scheduled yet. Add breakdown sheets to populate the strip board.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={strips.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">{renderSchedule()}</div>
              </SortableContext>
            </DndContext>
          )}

          {canEdit && strips.length > 0 && (
            <p className="mt-4 text-stone-600 text-sm">
              Drag strips to reorder. Click + between strips to add day breaks.
            </p>
          )}
        </>
      )}
    </div>
  );
}
