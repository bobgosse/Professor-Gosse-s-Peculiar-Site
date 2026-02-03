import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string; dbId: string }>;
}

// DELETE /api/projects/[id]/schedule/daybreaks/[dbId] - Remove a day break
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, dbId } = await params;
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

    // Verify the day break belongs to this schedule
    const dayBreak = await prisma.dayBreak.findFirst({
      where: { id: dbId, scheduleId: schedule.id },
    });

    if (!dayBreak) {
      return NextResponse.json(
        { error: "Day break not found" },
        { status: 404 }
      );
    }

    await prisma.dayBreak.delete({
      where: { id: dbId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting day break:", error);
    return NextResponse.json(
      { error: "Failed to delete day break" },
      { status: 500 }
    );
  }
}
