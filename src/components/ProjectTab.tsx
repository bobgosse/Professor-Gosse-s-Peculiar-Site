"use client";

import { useState } from "react";
import type { Project } from "@/hooks/useProject";
import { Save } from "lucide-react";

interface ProjectTabProps {
  project: Project;
  onUpdate: (updates: {
    title?: string;
    director?: string;
    producer?: string;
    ad?: string;
    scriptDate?: string;
  }) => Promise<void>;
}

export function ProjectTab({ project, onUpdate }: ProjectTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: project.title,
    director: project.director || "",
    producer: project.producer || "",
    ad: project.ad || "",
    scriptDate: project.scriptDate
      ? new Date(project.scriptDate).toISOString().split("T")[0]
      : "",
  });

  const canEdit = project.userAccess.canEdit || project.userAccess.isOwner;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        title: form.title,
        director: form.director || undefined,
        producer: form.producer || undefined,
        ad: form.ad || undefined,
        scriptDate: form.scriptDate || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      title: project.title,
      director: project.director || "",
      producer: project.producer || "",
      ad: project.ad || "",
      scriptDate: project.scriptDate
        ? new Date(project.scriptDate).toISOString().split("T")[0]
        : "",
    });
    setIsEditing(false);
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-display text-gold">Project Details</h2>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm text-stone-400 hover:text-white border border-stone-700 rounded-lg transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-2">
            Title
          </label>
          {isEditing ? (
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          ) : (
            <p className="text-lg text-white">{project.title}</p>
          )}
        </div>

        {/* Director */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-2">
            Director
          </label>
          {isEditing ? (
            <input
              type="text"
              value={form.director}
              onChange={(e) => setForm({ ...form, director: e.target.value })}
              placeholder="Director name"
              className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          ) : (
            <p className="text-white">{project.director || "—"}</p>
          )}
        </div>

        {/* Producer */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-2">
            Producer
          </label>
          {isEditing ? (
            <input
              type="text"
              value={form.producer}
              onChange={(e) => setForm({ ...form, producer: e.target.value })}
              placeholder="Producer name"
              className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          ) : (
            <p className="text-white">{project.producer || "—"}</p>
          )}
        </div>

        {/* 1st AD */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-2">
            1st Assistant Director
          </label>
          {isEditing ? (
            <input
              type="text"
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
              placeholder="1st AD name"
              className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          ) : (
            <p className="text-white">{project.ad || "—"}</p>
          )}
        </div>

        {/* Script Date */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-2">
            Script Date
          </label>
          {isEditing ? (
            <input
              type="date"
              value={form.scriptDate}
              onChange={(e) => setForm({ ...form, scriptDate: e.target.value })}
              className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            />
          ) : (
            <p className="text-white">
              {project.scriptDate
                ? new Date(project.scriptDate).toLocaleDateString()
                : "—"}
            </p>
          )}
        </div>

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !form.title.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-3 text-stone-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="mt-12 pt-8 border-t border-stone-800">
        <h3 className="text-lg font-medium text-stone-300 mb-4">
          Project Information
        </h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-stone-500">Owner</dt>
            <dd className="text-white">{project.owner.name || project.owner.email}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Your Role</dt>
            <dd className="text-white capitalize">{project.userAccess.level}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Created</dt>
            <dd className="text-white">
              {new Date(project.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Last Updated</dt>
            <dd className="text-white">
              {new Date(project.updatedAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
