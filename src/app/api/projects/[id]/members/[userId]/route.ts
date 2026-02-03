import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

// DELETE /api/projects/[id]/members/[userId] - Remove a member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, userId: memberUserId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Only owner or ADMIN members can remove members
    if (!access.canManageMembers && !access.isOwner) {
      return NextResponse.json(
        { error: "Only owner or admin can manage members" },
        { status: 403 }
      );
    }

    // Check if trying to remove the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === memberUserId) {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 400 }
      );
    }

    // Find and delete the membership
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: memberUserId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: memberUserId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
