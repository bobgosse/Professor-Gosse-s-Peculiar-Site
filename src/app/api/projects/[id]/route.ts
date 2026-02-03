import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Fetch a single project with all related data
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await getProjectAccess(id, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        characters: {
          orderBy: { number: "asc" },
        },
        breakdowns: {
          orderBy: { sortOrder: "asc" },
          include: {
            cast: {
              include: {
                character: true,
              },
            },
          },
        },
        schedule: {
          include: {
            stripSlots: {
              orderBy: { position: "asc" },
              include: {
                breakdown: {
                  select: {
                    id: true,
                    sceneNumbers: true,
                    intExt: true,
                    dayNight: true,
                    location: true,
                    pageCount: true,
                    description: true,
                  },
                },
              },
            },
            dayBreaks: {
              orderBy: { afterPosition: "asc" },
            },
            banners: {
              orderBy: { afterPosition: "asc" },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...project,
      userAccess: access,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project fields
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await getProjectAccess(id, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Only owner or ADMIN members can update project
    if (!access.isOwner && access.level !== "admin") {
      return NextResponse.json(
        { error: "Only owner or admin can update project details" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, director, producer, ad, scriptDate } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (director !== undefined) {
      updateData.director = director?.trim() || null;
    }

    if (producer !== undefined) {
      updateData.producer = producer?.trim() || null;
    }

    if (ad !== undefined) {
      updateData.ad = ad?.trim() || null;
    }

    if (scriptDate !== undefined) {
      updateData.scriptDate = scriptDate ? new Date(scriptDate) : null;
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project (owner only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await getProjectAccess(id, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Only owner can delete
    if (!access.isOwner) {
      return NextResponse.json(
        { error: "Only the owner can delete the project" },
        { status: 403 }
      );
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
