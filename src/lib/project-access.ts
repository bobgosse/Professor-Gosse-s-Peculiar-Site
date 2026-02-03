import { prisma } from "./prisma";
import type { ProjectMemberRole } from "@prisma/client";

export type AccessLevel = "owner" | "admin" | "editor" | "viewer" | null;

interface AccessResult {
  hasAccess: boolean;
  level: AccessLevel;
  canEdit: boolean;
  canManageMembers: boolean;
  isOwner: boolean;
}

/**
 * Check a user's access level for a project.
 * Returns access details including whether they can edit or manage members.
 */
export async function getProjectAccess(
  projectId: string,
  userId: string
): Promise<AccessResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return {
      hasAccess: false,
      level: null,
      canEdit: false,
      canManageMembers: false,
      isOwner: false,
    };
  }

  // Check if owner
  if (project.ownerId === userId) {
    return {
      hasAccess: true,
      level: "owner",
      canEdit: true,
      canManageMembers: true,
      isOwner: true,
    };
  }

  // Check membership
  const membership = project.members[0];
  if (!membership) {
    return {
      hasAccess: false,
      level: null,
      canEdit: false,
      canManageMembers: false,
      isOwner: false,
    };
  }

  const roleToLevel: Record<ProjectMemberRole, AccessLevel> = {
    ADMIN: "admin",
    EDITOR: "editor",
    VIEWER: "viewer",
  };

  const level = roleToLevel[membership.role];
  const canEdit = membership.role === "ADMIN" || membership.role === "EDITOR";
  const canManageMembers = membership.role === "ADMIN";

  return {
    hasAccess: true,
    level,
    canEdit,
    canManageMembers,
    isOwner: false,
  };
}

/**
 * Require a minimum access level, throwing an error if not met.
 * Useful for API routes that need specific permissions.
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  minimumLevel: "viewer" | "editor" | "admin" | "owner" = "viewer"
): Promise<AccessResult> {
  const access = await getProjectAccess(projectId, userId);

  if (!access.hasAccess) {
    throw new Error("Project not found or access denied");
  }

  const levelHierarchy: AccessLevel[] = ["viewer", "editor", "admin", "owner"];
  const userLevelIndex = levelHierarchy.indexOf(access.level);
  const requiredLevelIndex = levelHierarchy.indexOf(minimumLevel);

  if (userLevelIndex < requiredLevelIndex) {
    throw new Error("Insufficient permissions");
  }

  return access;
}
