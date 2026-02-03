"use client";

import { useState, useMemo } from "react";
import type { Schedule, DayBreak, BannerStrip } from "@/hooks/useSchedule";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
} from "lucide-react";

interface ProductionCalendarProps {
  schedule: Schedule;
  canEdit: boolean;
  onUpdateStartDate: (date: string | null) => Promise<void>;
}

type DayType = "shoot" | "travel" | "holiday" | "prep" | "off" | "move" | "info";

interface CalendarDayInfo {
  date: Date;
  type: DayType | null;
  shootDayNumber?: number;
  label?: string;
  isCurrentMonth: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateForInput(date: Date): string {
  // Use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse date string as local date (not UTC) to avoid timezone offset issues
function parseLocalDate(dateStr: string): Date {
  // If the date is ISO format like "2026-02-03T00:00:00.000Z", extract just the date part
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  // Create date at noon local time to avoid any DST/timezone boundary issues
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function ProductionCalendar({
  schedule,
  canEdit,
  onUpdateStartDate,
}: ProductionCalendarProps) {
  const startDate = schedule.startDate ? parseLocalDate(schedule.startDate) : null;
  const [viewDate, setViewDate] = useState(() => startDate || new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(
    startDate ? formatDateForInput(startDate) : ""
  );

  // Build the calendar mapping
  const calendarMap = useMemo(() => {
    const map = new Map<string, CalendarDayInfo>();

    if (!startDate) return map;

    const totalDays = schedule.dayBreaks.length + 1; // +1 for the last day after final break
    let currentDate = new Date(startDate.getTime()); // Clone the date
    let shootDayNumber = 1;

    // Map banner types to day types
    const bannerTypeToDay: Record<string, DayType> = {
      TRAVEL: "travel",
      HOLIDAY: "holiday",
      PRERIG: "prep",
      MOVE: "move",
      INFO: "info",
    };

    // First, mark all shoot days
    for (let day = 1; day <= totalDays; day++) {
      const dateKey = formatDateForInput(currentDate);

      // Check if there's a day break after this day
      const dayBreak = schedule.dayBreaks.find(db => db.dayNumber === day);

      map.set(dateKey, {
        date: new Date(currentDate),
        type: "shoot",
        shootDayNumber: shootDayNumber,
        isCurrentMonth: true,
      });

      shootDayNumber++;
      currentDate = addDays(currentDate, 1);

      // Skip non-shoot days (weekends if we want, or just advance)
      // For now, we'll just advance to the next day
    }

    // Now overlay banners (holidays, travel days, etc.) based on their afterPosition
    // Banners don't have dates stored directly, so we need to calculate based on the schedule
    // For a more complete implementation, we'd need to track banner dates separately

    return map;
  }, [schedule, startDate]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const days: CalendarDayInfo[] = [];

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      const dateKey = formatDateForInput(date);
      const existingInfo = calendarMap.get(dateKey);

      days.push({
        date,
        type: existingInfo?.type || null,
        shootDayNumber: existingInfo?.shootDayNumber,
        label: existingInfo?.label,
        isCurrentMonth: false,
      });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDateForInput(date);
      const existingInfo = calendarMap.get(dateKey);

      days.push({
        date,
        type: existingInfo?.type || null,
        shootDayNumber: existingInfo?.shootDayNumber,
        label: existingInfo?.label,
        isCurrentMonth: true,
      });
    }

    // Next month's leading days (to complete the grid)
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateKey = formatDateForInput(date);
      const existingInfo = calendarMap.get(dateKey);

      days.push({
        date,
        type: existingInfo?.type || null,
        shootDayNumber: existingInfo?.shootDayNumber,
        label: existingInfo?.label,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewDate, calendarMap]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSaveStartDate = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStartDate(tempStartDate || null);
      setEditingStartDate(false);
    } catch (error) {
      console.error("Failed to update start date:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getDayClass = (day: CalendarDayInfo): string => {
    const baseClass = "h-24 p-1 border border-stone-800 text-left align-top transition-colors";

    if (!day.isCurrentMonth) {
      return `${baseClass} bg-stone-950 text-stone-700`;
    }

    switch (day.type) {
      case "shoot":
        return `${baseClass} bg-gold/20 text-gold`;
      case "travel":
        return `${baseClass} bg-blue-900/30 text-blue-400`;
      case "holiday":
        return `${baseClass} bg-red-900/30 text-red-400`;
      case "prep":
        return `${baseClass} bg-purple-900/30 text-purple-400`;
      case "off":
        return `${baseClass} bg-stone-800 text-stone-500`;
      case "move":
        return `${baseClass} bg-orange-900/30 text-orange-400`;
      default:
        return `${baseClass} bg-stone-900 text-stone-400`;
    }
  };

  const totalShootDays = schedule.dayBreaks.length + (schedule.stripSlots.length > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display text-gold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Production Calendar
          </h3>
          <p className="text-stone-500 text-sm mt-1">
            {totalShootDays} shoot day{totalShootDays !== 1 ? "s" : ""} scheduled
          </p>
        </div>
      </div>

      {/* Start Date Setting */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-300">Shoot Start Date</p>
            <p className="text-stone-500 text-sm">
              {startDate
                ? startDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Not set"}
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              {editingStartDate ? (
                <>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  <button
                    onClick={handleSaveStartDate}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingStartDate(false);
                      setTempStartDate(startDate ? formatDateForInput(startDate) : "");
                    }}
                    className="px-4 py-2 text-stone-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingStartDate(true)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-medium rounded text-sm transition-colors"
                >
                  {startDate ? "Change Date" : "Set Start Date"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gold/20 border border-gold/50" />
          <span className="text-stone-400">Shoot Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-900/30 border border-blue-800" />
          <span className="text-stone-400">Travel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-900/30 border border-red-800" />
          <span className="text-stone-400">Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-900/30 border border-purple-800" />
          <span className="text-stone-400">Prep</span>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h4 className="text-lg font-medium text-white">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </h4>
        <button
          onClick={handleNextMonth}
          className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="border border-stone-800 rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-stone-900">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-stone-500 border-b border-stone-800"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div key={index} className={getDayClass(day)}>
              <div className="flex items-start justify-between">
                <span
                  className={`text-sm ${
                    day.isCurrentMonth ? "font-medium" : "font-normal"
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {day.shootDayNumber && (
                  <span className="text-xs bg-gold text-stone-950 px-1.5 py-0.5 rounded font-bold">
                    D{day.shootDayNumber}
                  </span>
                )}
              </div>
              {day.label && (
                <p className="text-xs mt-1 truncate">{day.label}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {!startDate && (
        <div className="text-center py-8 bg-stone-900/50 border border-stone-800 rounded-lg">
          <Calendar className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-500">
            Set a start date to see your shoot days mapped to the calendar.
          </p>
        </div>
      )}
    </div>
  );
}
