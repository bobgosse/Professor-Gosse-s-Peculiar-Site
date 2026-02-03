"use client";

import { useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { useSchedule } from "@/hooks/useSchedule";
import { useElements } from "@/hooks/useElements";
import {
  ArrowLeft,
  Film,
  Users,
  FileText,
  Calendar,
  BarChart3,
} from "lucide-react";
import { ProjectTab } from "@/components/ProjectTab";
import { CastListTab } from "@/components/CastListTab";
import { BreakdownsTab } from "@/components/BreakdownsTab";
import { StripBoardTab } from "@/components/StripBoardTab";
import { ReportsTab } from "@/components/ReportsTab";

type Tab = "project" | "cast" | "breakdowns" | "stripboard" | "reports";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { status } = useSession();
  const { project, isLoading, ...projectActions } = useProject(id);
  const scheduleData = useSchedule(id);
  const { elements, createElement: createElementFn } = useElements(id);
  const [activeTab, setActiveTab] = useState<Tab>("project");

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

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-stone-400 mb-4">
            Project not found
          </h2>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gold hover:text-gold-light"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "project", label: "Project", icon: <Film className="w-4 h-4" /> },
    { id: "cast", label: "Cast List", icon: <Users className="w-4 h-4" /> },
    { id: "breakdowns", label: "Breakdowns", icon: <FileText className="w-4 h-4" /> },
    { id: "stripboard", label: "Strip Board", icon: <Calendar className="w-4 h-4" /> },
    { id: "reports", label: "Reports", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900 border-r border-stone-800 flex flex-col">
        {/* Back to Dashboard */}
        <div className="p-4 border-b border-stone-800">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        {/* Project Title */}
        <div className="p-4 border-b border-stone-800">
          <h1 className="font-display text-lg text-gold truncate">
            {project.title}
          </h1>
          {project.director && (
            <p className="text-stone-500 text-sm">Dir. {project.director}</p>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? "bg-gold/10 text-gold"
                  : "text-stone-400 hover:bg-stone-800 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Project Stats */}
        <div className="p-4 border-t border-stone-800 text-sm text-stone-500">
          <div className="flex justify-between mb-1">
            <span>Scenes</span>
            <span>{project.breakdowns.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Cast</span>
            <span>{project.characters.length}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === "project" && (
          <ProjectTab project={project} onUpdate={projectActions.updateProject} />
        )}
        {activeTab === "cast" && (
          <CastListTab
            characters={project.characters}
            canEdit={project.userAccess.canEdit || project.userAccess.isOwner}
            onAdd={projectActions.addCharacter}
            onUpdate={projectActions.updateCharacter}
            onDelete={projectActions.deleteCharacter}
            onReorder={projectActions.reorderCharacters}
          />
        )}
        {activeTab === "breakdowns" && (
          <BreakdownsTab
            breakdowns={project.breakdowns}
            characters={project.characters}
            elements={elements}
            canEdit={project.userAccess.canEdit || project.userAccess.isOwner}
            onCreate={projectActions.createBreakdown}
            onUpdate={projectActions.updateBreakdown}
            onDelete={projectActions.deleteBreakdown}
            onAddCharacter={projectActions.addCharacter}
            onCreateElement={createElementFn}
          />
        )}
        {activeTab === "stripboard" && (
          <StripBoardTab
            schedule={scheduleData.schedule}
            canEdit={project.userAccess.canEdit || project.userAccess.isOwner}
            onReorder={scheduleData.reorderStrip}
            onToggleDayBreak={scheduleData.toggleDayBreak}
            onRenumberDayBreaks={scheduleData.renumberDayBreaks}
            onUpdateStartDate={scheduleData.updateStartDate}
          />
        )}
        {activeTab === "reports" && (
          <ReportsTab
            project={project}
            schedule={scheduleData.schedule}
          />
        )}
      </main>
    </div>
  );
}
