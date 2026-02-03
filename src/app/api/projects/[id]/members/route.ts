import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/members - Add a member by email
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Only owner or ADMIN members can add members
    if (!access.canManageMembers && !access.isOwner) {
      return NextResponse.json(
        { error: "Only owner or admin can manage members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const validRoles = ["VIEWER", "EDITOR", "ADMIN"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role must be VIEWER, EDITOR, or ADMIN" },
        { status: 400 }
      );
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: "No user found with that email" },
        { status: 404 }
      );
    }

    // Check if user is already the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === userToAdd.id) {
      return NextResponse.json(
        { error: "Cannot add the owner as a member" },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 409 }
      );
    }

    // Create membership
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}
