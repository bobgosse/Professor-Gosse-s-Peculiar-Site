import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/schedule/reorder - Reorder a strip
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
        { error: "You don't have permission to reorder the schedule" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { stripId, newPosition } = body;

    if (!stripId || typeof stripId !== "string") {
      return NextResponse.json(
        { error: "stripId is required" },
        { status: 400 }
      );
    }

    if (typeof newPosition !== "number" || newPosition < 1) {
      return NextResponse.json(
        { error: "newPosition must be a positive number" },
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

    // Get the strip being moved
    const strip = await prisma.stripSlot.findFirst({
      where: { id: stripId, scheduleId: schedule.id },
    });

    if (!strip) {
      return NextResponse.json(
        { error: "Strip not found" },
        { status: 404 }
      );
    }

    const oldPosition = strip.position;

    // No change needed
    if (oldPosition === newPosition) {
      return NextResponse.json({ success: true, message: "No change needed" });
    }

    // Get the max position to validate newPosition
    const maxPosition = await prisma.stripSlot.aggregate({
      where: { scheduleId: schedule.id },
      _max: { position: true },
    });

    if (newPosition > (maxPosition._max.position || 1)) {
      return NextResponse.json(
        { error: "newPosition exceeds the number of strips" },
        { status: 400 }
      );
    }

    // Perform the reorder in a transaction
    await prisma.$transaction(async (tx) => {
      if (newPosition > oldPosition) {
        // Moving down: decrement positions between old and new (exclusive of old, inclusive of new)
        await tx.stripSlot.updateMany({
          where: {
            scheduleId: schedule.id,
            position: {
              gt: oldPosition,
              lte: newPosition,
            },
          },
          data: {
            position: { decrement: 1 },
          },
        });
      } else {
        // Moving up: increment positions between new and old (inclusive of new, exclusive of old)
        await tx.stripSlot.updateMany({
          where: {
            scheduleId: schedule.id,
            position: {
              gte: newPosition,
              lt: oldPosition,
            },
          },
          data: {
            position: { increment: 1 },
          },
        });
      }

      // Set the strip to its new position
      await tx.stripSlot.update({
        where: { id: stripId },
        data: { position: newPosition },
      });
    });

    // Return updated schedule
    const updatedSchedule = await prisma.schedule.findUnique({
      where: { projectId },
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
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error("Error reordering schedule:", error);
    return NextResponse.json(
      { error: "Failed to reorder schedule" },
      { status: 500 }
    );
  }
}
