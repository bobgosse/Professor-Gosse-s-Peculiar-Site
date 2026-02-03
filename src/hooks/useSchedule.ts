import useSWR from "swr";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { BreakdownSheet, BreakdownCast } from "./useProject";

export interface StripSlot {
  id: string;
  scheduleId: string;
  breakdownId: string;
  position: number;
  breakdown: BreakdownSheet & {
    cast: BreakdownCast[];
  };
}

export interface DayBreak {
  id: string;
  scheduleId: string;
  afterPosition: number;
  dayNumber: number;
  shootDate: string | null;
  notes: string | null;
}

export interface BannerStrip {
  id: string;
  scheduleId: string;
  afterPosition: number;
  label: string;
  bannerType: "TRAVEL" | "MOVE" | "HOLIDAY" | "PRERIG" | "INFO";
}

export interface Schedule {
  id: string;
  projectId: string;
  startDate: string | null;
  createdAt: string;
  updatedAt: string;
  stripSlots: StripSlot[];
  dayBreaks: DayBreak[];
  banners: BannerStrip[];
}

export type CalendarDayType = "shoot" | "travel" | "holiday" | "prep" | "off";

export interface CalendarDay {
  date: Date;
  type: CalendarDayType;
  dayNumber?: number; // Shoot day number
  label?: string;
}

export function useSchedule(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Schedule>(
    projectId ? `/api/projects/${projectId}/schedule` : null,
    apiGet
  );

  const updateStartDate = async (startDate: string | null) => {
    if (!projectId) return;
    await apiPatch(`/api/projects/${projectId}/schedule`, { startDate });
    await mutate();
  };

  const reorderStrip = async (stripId: string, newPosition: number) => {
    if (!projectId) return;
    await apiPost(`/api/projects/${projectId}/schedule/reorder`, {
      stripId,
      newPosition,
    });
    await mutate();
  };

  const toggleDayBreak = async (afterPosition: number) => {
    if (!projectId) return;
    const result = await apiPost<{ action: "created" | "deleted"; dayBreak: DayBreak }>(
      `/api/projects/${projectId}/schedule/daybreaks`,
      { afterPosition }
    );
    await mutate();
    return result;
  };

  const deleteDayBreak = async (dbId: string) => {
    if (!projectId) return;
    await apiDelete(`/api/projects/${projectId}/schedule/daybreaks/${dbId}`);
    await mutate();
  };

  const renumberDayBreaks = async () => {
    if (!projectId) return;
    await apiPost(`/api/projects/${projectId}/schedule/daybreaks/renumber`);
    await mutate();
  };

  const createBanner = async (
    afterPosition: number,
    label: string,
    bannerType: "TRAVEL" | "MOVE" | "HOLIDAY" | "PRERIG" | "INFO"
  ) => {
    if (!projectId) return;
    await apiPost(`/api/projects/${projectId}/schedule/banners`, {
      afterPosition,
      label,
      bannerType,
    });
    await mutate();
  };

  const deleteBanner = async (bId: string) => {
    if (!projectId) return;
    await apiDelete(`/api/projects/${projectId}/schedule/banners/${bId}`);
    await mutate();
  };

  return {
    schedule: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
    updateStartDate,
    reorderStrip,
    toggleDayBreak,
    deleteDayBreak,
    renumberDayBreaks,
    createBanner,
    deleteBanner,
  };
}
