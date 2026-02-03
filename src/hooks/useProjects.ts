import useSWR from "swr";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export interface ProjectSummary {
  id: string;
  title: string;
  director: string | null;
  producer: string | null;
  ad: string | null;
  scriptDate: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  userRole: "owner" | "ADMIN" | "EDITOR" | "VIEWER";
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    breakdowns: number;
    characters: number;
  };
}

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<ProjectSummary[]>(
    "/api/projects",
    apiGet
  );

  const createProject = async (projectData: {
    title: string;
    director?: string;
    producer?: string;
    ad?: string;
    scriptDate?: string;
  }) => {
    const newProject = await apiPost<ProjectSummary>("/api/projects", projectData);
    await mutate();
    return newProject;
  };

  const deleteProject = async (projectId: string) => {
    await apiDelete(`/api/projects/${projectId}`);
    await mutate();
  };

  return {
    projects: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
    createProject,
    deleteProject,
  };
}
