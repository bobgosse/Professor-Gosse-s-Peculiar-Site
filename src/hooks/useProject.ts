import useSWR, { useSWRConfig } from "swr";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";

export interface Character {
  id: string;
  projectId: string;
  number: number;
  name: string;
  actor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreakdownCast {
  id: string;
  breakdownId: string;
  characterId: string;
  character: Character;
}

export type ElementCategory =
  | "WARDROBE"
  | "PROPS"
  | "SET_DRESSING"
  | "ART_DEPT"
  | "SPECIAL_PERSONNEL"
  | "VEHICLES"
  | "CAMERA"
  | "MECHANICAL_FX"
  | "VISUAL_FX"
  | "SPECIAL_EQUIP"
  | "ANIMALS"
  | "SOUND_MUSIC"
  | "OTHER";

export interface ProductionElement {
  id: string;
  projectId: string;
  category: ElementCategory;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreakdownElement {
  id: string;
  breakdownId: string;
  elementId: string;
  element: ProductionElement;
}

export interface BreakdownSheet {
  id: string;
  projectId: string;
  sceneNumbers: string;
  intExt: "INT" | "EXT" | null;
  location: string | null;
  dayNight: "DAY" | "NIGHT" | "DUSK" | "DAWN" | "DAY_FOR_NIGHT" | null;
  pageCount: string | null;
  description: string | null;
  storyDay: number | null;
  cameraSetups: number | null;
  isFlashback: boolean;
  sortOrder: number;
  stunts: string | null;
  extras: string | null;
  wardrobe: string | null;
  props: string | null;
  setDressing: string | null;
  artDept: string | null;
  specialPersonnel: string | null;
  vehicles: string | null;
  camera: string | null;
  mechanicalFx: string | null;
  visualFx: string | null;
  specialEquip: string | null;
  animals: string | null;
  soundMusic: string | null;
  other: string | null;
  dqs: string | null;
  createdAt: string;
  updatedAt: string;
  cast: BreakdownCast[];
  elements: BreakdownElement[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: "VIEWER" | "EDITOR" | "ADMIN";
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface AccessLevel {
  hasAccess: boolean;
  level: "owner" | "admin" | "editor" | "viewer" | null;
  canEdit: boolean;
  canManageMembers: boolean;
  isOwner: boolean;
}

export interface Project {
  id: string;
  title: string;
  director: string | null;
  producer: string | null;
  ad: string | null;
  scriptDate: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  members: ProjectMember[];
  characters: Character[];
  breakdowns: BreakdownSheet[];
  schedule: {
    id: string;
    projectId: string;
    startDate: string | null;
  } | null;
  userAccess: AccessLevel;
}

export function useProject(projectId: string | null) {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<Project>(
    projectId ? `/api/projects/${projectId}` : null,
    apiGet
  );

  // Helper to mutate both project and schedule caches
  const mutateWithSchedule = async () => {
    await mutate();
    // Also refresh the schedule cache since breakdowns affect strip slots
    if (projectId) {
      await globalMutate(`/api/projects/${projectId}/schedule`);
    }
  };

  const updateProject = async (updates: {
    title?: string;
    director?: string;
    producer?: string;
    ad?: string;
    scriptDate?: string;
  }) => {
    if (!projectId) return;
    await apiPatch(`/api/projects/${projectId}`, updates);
    await mutate();
  };

  // Character operations
  const addCharacter = async (name: string, actor?: string) => {
    if (!projectId) return;
    await apiPost(`/api/projects/${projectId}/characters`, { name, actor });
    await mutate();
  };

  const updateCharacter = async (charId: string, updates: { name?: string; actor?: string }) => {
    if (!projectId) return;
    await apiPatch(`/api/projects/${projectId}/characters/${charId}`, updates);
    await mutate();
  };

  const deleteCharacter = async (charId: string) => {
    if (!projectId) return;
    await apiDelete(`/api/projects/${projectId}/characters/${charId}`);
    await mutate();
  };

  const reorderCharacters = async (characterIds: string[]) => {
    if (!projectId) return;
    await apiPost(`/api/projects/${projectId}/characters/reorder`, { characterIds });
    await mutate();
  };

  // Breakdown operations - these also affect the schedule (strip slots)
  const createBreakdown = async (data: Partial<BreakdownSheet> & { castIds?: string[]; elementIds?: string[] }) => {
    if (!projectId) return;
    await apiPost(`/api/projects/${projectId}/breakdowns`, data);
    await mutateWithSchedule();
  };

  const updateBreakdown = async (bdId: string, data: Partial<BreakdownSheet> & { castIds?: string[]; elementIds?: string[] }) => {
    if (!projectId) return;
    await apiPatch(`/api/projects/${projectId}/breakdowns/${bdId}`, data);
    await mutateWithSchedule();
  };

  const deleteBreakdown = async (bdId: string) => {
    if (!projectId) return;
    await apiDelete(`/api/projects/${projectId}/breakdowns/${bdId}`);
    await mutateWithSchedule();
  };

  // Member operations
  const addMember = async (email: string, role: "VIEWER" | "EDITOR" | "ADMIN") => {
    if (!projectId) return;
    await apiPost(`/api/projects/${projectId}/members`, { email, role });
    await mutate();
  };

  const removeMember = async (userId: string) => {
    if (!projectId) return;
    await apiDelete(`/api/projects/${projectId}/members/${userId}`);
    await mutate();
  };

  return {
    project: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
    updateProject,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    reorderCharacters,
    createBreakdown,
    updateBreakdown,
    deleteBreakdown,
    addMember,
    removeMember,
  };
}
