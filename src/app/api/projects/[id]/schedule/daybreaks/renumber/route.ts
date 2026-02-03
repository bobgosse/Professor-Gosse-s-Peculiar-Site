import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/schedule/daybreaks/renumber - Renumber all day breaks
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

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to manage day breaks" },
        { status: 403 }
      );
    }

    // Get the schedule
    const schedule = await prisma.schedule.findUnique({
      where: { projectId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    // Fetch all day breaks ordered by afterPosition
    const dayBreaks = await prisma.dayBreak.findMany({
      where: { scheduleId: schedule.id },
      orderBy: { afterPosition: "asc" },
    });

    // Renumber sequentially in a transaction
    await prisma.$transaction(
      dayBreaks.map((db, index) =>
        prisma.dayBreak.update({
          where: { id: db.id },
          data: { dayNumber: index + 1 },
        })
      )
    );

    // Return the renumbered day breaks
    const renumbered = await prisma.dayBreak.findMany({
      where: { scheduleId: schedule.id },
      orderBy: { afterPosition: "asc" },
    });

    return NextResponse.json(renumbered);
  } catch (error) {
    console.error("Error renumbering day breaks:", error);
    return NextResponse.json(
      { error: "Failed to renumber day breaks" },
      { status: 500 }
    );
  }
}
