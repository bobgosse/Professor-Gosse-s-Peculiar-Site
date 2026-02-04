import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string; bdId: string }>;
}

// GET /api/projects/[id]/breakdowns/[bdId] - Fetch a single breakdown
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, bdId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const breakdown = await prisma.breakdownSheet.findFirst({
      where: { id: bdId, projectId },
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
    });

    if (!breakdown) {
      return NextResponse.json(
        { error: "Breakdown not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(breakdown);
  } catch (error) {
    console.error("Error fetching breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakdown" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/breakdowns/[bdId] - Update a breakdown
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, bdId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to edit breakdowns" },
        { status: 403 }
      );
    }

    // Verify breakdown belongs to this project
    const existing = await prisma.breakdownSheet.findFirst({
      where: { id: bdId, projectId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Breakdown not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      sceneNumbers,
      intExt,
      location,
      dayNight,
      pageCount,
      description,
      storyDay,
      cameraSetups,
      isFlashback,
      stunts,
      extras,
      wardrobe,
      props,
      setDressing,
      artDept,
      specialPersonnel,
      vehicles,
      camera,
      mechanicalFx,
      visualFx,
      specialEquip,
      animals,
      soundMusic,
      other,
      dqs,
      castIds,
      elementIds,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (sceneNumbers !== undefined) {
      if (typeof sceneNumbers !== "string" || sceneNumbers.trim().length === 0) {
        return NextResponse.json(
          { error: "Scene numbers cannot be empty" },
          { status: 400 }
        );
      }
      updateData.sceneNumbers = sceneNumbers.trim();
    }

    if (intExt !== undefined) updateData.intExt = intExt || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (dayNight !== undefined) updateData.dayNight = dayNight || null;
    if (pageCount !== undefined) updateData.pageCount = pageCount?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (storyDay !== undefined) updateData.storyDay = storyDay ? parseInt(storyDay, 10) : null;
    if (cameraSetups !== undefined) updateData.cameraSetups = cameraSetups ? parseInt(cameraSetups, 10) : null;
    if (isFlashback !== undefined) updateData.isFlashback = isFlashback || false;
    if (stunts !== undefined) updateData.stunts = stunts?.trim() || null;
    if (extras !== undefined) updateData.extras = extras?.trim() || null;
    if (wardrobe !== undefined) updateData.wardrobe = wardrobe?.trim() || null;
    if (props !== undefined) updateData.props = props?.trim() || null;
    if (setDressing !== undefined) updateData.setDressing = setDressing?.trim() || null;
    if (artDept !== undefined) updateData.artDept = artDept?.trim() || null;
    if (specialPersonnel !== undefined) updateData.specialPersonnel = specialPersonnel?.trim() || null;
    if (vehicles !== undefined) updateData.vehicles = vehicles?.trim() || null;
    if (camera !== undefined) updateData.camera = camera?.trim() || null;
    if (mechanicalFx !== undefined) updateData.mechanicalFx = mechanicalFx?.trim() || null;
    if (visualFx !== undefined) updateData.visualFx = visualFx?.trim() || null;
    if (specialEquip !== undefined) updateData.specialEquip = specialEquip?.trim() || null;
    if (animals !== undefined) updateData.animals = animals?.trim() || null;
    if (soundMusic !== undefined) updateData.soundMusic = soundMusic?.trim() || null;
    if (other !== undefined) updateData.other = other?.trim() || null;
    if (dqs !== undefined) updateData.dqs = dqs?.trim() || null;

    // Handle cast update in transaction if castIds provided
    const breakdown = await prisma.$transaction(async (tx) => {
      // Update breakdown fields
      await tx.breakdownSheet.update({
        where: { id: bdId },
        data: updateData,
      });

      // If castIds is provided, replace all cast relations
      if (castIds !== undefined && Array.isArray(castIds)) {
        // Delete existing cast relations
        await tx.breakdownCast.deleteMany({
          where: { breakdownId: bdId },
        });

        // Validate and create new cast relations
        if (castIds.length > 0) {
          const characters = await tx.character.findMany({
            where: {
              projectId,
              id: { in: castIds },
            },
            select: { id: true },
          });
          const validIds = characters.map((c) => c.id);

          await tx.breakdownCast.createMany({
            data: validIds.map((characterId) => ({
              breakdownId: bdId,
              characterId,
            })),
          });
        }
      }

      // If elementIds is provided, replace all element relations
      if (elementIds !== undefined && Array.isArray(elementIds)) {
        // Delete existing element relations
        await tx.breakdownElement.deleteMany({
          where: { breakdownId: bdId },
        });

        // Validate and create new element relations
        if (elementIds.length > 0) {
          const elements = await tx.productionElement.findMany({
            where: {
              projectId,
              id: { in: elementIds },
            },
            select: { id: true },
          });
          const validIds = elements.map((e: { id: string }) => e.id);

          await tx.breakdownElement.createMany({
            data: validIds.map((elementId: string) => ({
              breakdownId: bdId,
              elementId,
            })),
          });
        }
      }

      // Return with updated relations
      return tx.breakdownSheet.findUnique({
        where: { id: bdId },
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
      });
    });

    return NextResponse.json(breakdown);
  } catch (error) {
    console.error("Error updating breakdown:", error);
    return NextResponse.json(
      { error: "Failed to update breakdown" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/breakdowns/[bdId] - Delete a breakdown
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, bdId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to delete breakdowns" },
        { status: 403 }
      );
    }

    // Verify breakdown belongs to this project
    const existing = await prisma.breakdownSheet.findFirst({
      where: { id: bdId, projectId },
      include: { stripSlot: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Breakdown not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // If there's a strip slot, we need to reorder after deletion
      if (existing.stripSlot) {
        const deletedPosition = existing.stripSlot.position;
        const scheduleId = existing.stripSlot.scheduleId;

        // Delete the strip slot (cascade doesn't apply here since we're deleting breakdown)
        await tx.stripSlot.delete({
          where: { id: existing.stripSlot.id },
        });

        // Reorder remaining strips to close the gap
        await tx.stripSlot.updateMany({
          where: {
            scheduleId,
            position: { gt: deletedPosition },
          },
          data: {
            position: { decrement: 1 },
          },
        });
      }

      // Delete the breakdown (cascades to BreakdownCast)
      await tx.breakdownSheet.delete({
        where: { id: bdId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting breakdown:", error);
    return NextResponse.json(
      { error: "Failed to delete breakdown" },
      { status: 500 }
    );
  }
}
