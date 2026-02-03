"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useProjects } from "@/hooks/useProjects";
import { Plus, Trash2, Film, Users, FileText, LogOut } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { projects, isLoading, createProject, deleteProject } = useProjects();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const project = await createProject({ title: newTitle.trim() });
      setNewTitle("");
      setShowNewProject(false);
      if (project) {
        router.push(`/project/${project.id}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteProject(projectId);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/professor-gosse.jpeg"
              alt="Professor Gosse"
              width={96}
              height={96}
              className="rounded-full border-2 border-gold object-cover"
            />
            <div>
              <h1 className="font-victorian text-2xl text-gold">
                Professor Gosse&apos;s
              </h1>
              <p className="text-stone-400 text-sm">
                Peculiar Breakdown &amp; Scheduling Site
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-stone-400 text-sm">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* New Project Form */}
        {showNewProject && (
          <div className="mb-8 p-6 bg-stone-900 border border-stone-800 rounded-lg">
            <form onSubmit={handleCreateProject} className="flex gap-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Project title..."
                autoFocus
                className="flex-1 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isCreating || !newTitle.trim()}
                className="px-6 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewProject(false);
                  setNewTitle("");
                }}
                className="px-4 py-2 text-stone-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-16 h-16 mx-auto text-stone-700 mb-4" />
            <h3 className="text-lg font-medium text-stone-400 mb-2">
              No projects yet
            </h3>
            <p className="text-stone-500 mb-6">
              Create your first project to start breaking down your screenplay.
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-stone-900 border border-stone-800 rounded-lg overflow-hidden hover:border-stone-700 transition-colors"
              >
                <button
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="w-full text-left p-6"
                >
                  <h3 className="font-display text-xl text-white mb-2 group-hover:text-gold transition-colors">
                    {project.title}
                  </h3>
                  {project.director && (
                    <p className="text-stone-400 text-sm mb-4">
                      Dir. {project.director}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {project._count.breakdowns} scenes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {project._count.characters} cast
                    </span>
                  </div>
                </button>
                {(project.userRole === "owner" || project.userRole === "ADMIN") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id, project.title);
                    }}
                    className="absolute top-4 right-4 p-2 text-stone-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
