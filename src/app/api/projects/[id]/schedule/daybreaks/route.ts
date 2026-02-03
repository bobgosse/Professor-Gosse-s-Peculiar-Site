import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/schedule/daybreaks - Toggle a day break
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

    const body = await request.json();
    const { afterPosition } = body;

    if (typeof afterPosition !== "number" || afterPosition < 0) {
      return NextResponse.json(
        { error: "afterPosition must be a non-negative number" },
        { status: 400 }
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

    // Check if a day break already exists at this position
    const existingDayBreak = await prisma.dayBreak.findUnique({
      where: {
        scheduleId_afterPosition: {
          scheduleId: schedule.id,
          afterPosition,
        },
      },
    });

    if (existingDayBreak) {
      // Delete the existing day break (toggle off)
      await prisma.dayBreak.delete({
        where: { id: existingDayBreak.id },
      });

      return NextResponse.json({
        action: "deleted",
        dayBreak: existingDayBreak,
      });
    } else {
      // Create a new day break with the next available day number
      const maxDayNumber = await prisma.dayBreak.aggregate({
        where: { scheduleId: schedule.id },
        _max: { dayNumber: true },
      });

      const nextDayNumber = (maxDayNumber._max.dayNumber || 0) + 1;

      const newDayBreak = await prisma.dayBreak.create({
        data: {
          scheduleId: schedule.id,
          afterPosition,
          dayNumber: nextDayNumber,
        },
      });

      return NextResponse.json({
        action: "created",
        dayBreak: newDayBreak,
      }, { status: 201 });
    }
  } catch (error) {
    console.error("Error toggling day break:", error);
    return NextResponse.json(
      { error: "Failed to toggle day break" },
      { status: 500 }
    );
  }
}
