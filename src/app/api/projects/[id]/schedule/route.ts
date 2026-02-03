import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/projects/[id]/schedule - Update schedule (e.g., startDate)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to edit the schedule" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startDate } = body;

    const schedule = await prisma.schedule.update({
      where: { projectId },
      data: {
        startDate: startDate ? new Date(startDate) : null,
      },
      include: {
        stripSlots: {
          orderBy: { position: "asc" },
          include: {
            breakdown: {
              include: {
                cast: {
                  include: { character: true },
                  orderBy: { character: { number: "asc" } },
                },
                elements: {
                  include: { element: true },
                  orderBy: { element: { name: "asc" } },
                },
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
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/schedule - Fetch the schedule with all data
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const schedule = await prisma.schedule.findUnique({
      where: { projectId },
      include: {
        stripSlots: {
          orderBy: { position: "asc" },
          include: {
            breakdown: {
              include: {
                cast: {
                  include: { character: true },
                  orderBy: { character: { number: "asc" } },
                },
                elements: {
                  include: { element: true },
                  orderBy: { element: { name: "asc" } },
                },
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
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
