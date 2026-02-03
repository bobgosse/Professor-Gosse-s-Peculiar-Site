import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string; charId: string }>;
}

// PATCH /api/projects/[id]/characters/[charId] - Update a character
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, charId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to edit characters" },
        { status: 403 }
      );
    }

    // Verify character belongs to this project
    const existingCharacter = await prisma.character.findFirst({
      where: { id: charId, projectId },
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, actor } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Character name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (actor !== undefined) {
      updateData.actor = actor?.trim() || null;
    }

    const character = await prisma.character.update({
      where: { id: charId },
      data: updateData,
    });

    return NextResponse.json(character);
  } catch (error) {
    console.error("Error updating character:", error);
    return NextResponse.json(
      { error: "Failed to update character" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/characters/[charId] - Delete a character and renumber
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, charId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to delete characters" },
        { status: 403 }
      );
    }

    // Verify character belongs to this project
    const existingCharacter = await prisma.character.findFirst({
      where: { id: charId, projectId },
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const deletedNumber = existingCharacter.number;

    // Delete the character
    await prisma.character.delete({
      where: { id: charId },
    });

    // Renumber remaining characters to keep sequence contiguous
    await prisma.character.updateMany({
      where: {
        projectId,
        number: { gt: deletedNumber },
      },
      data: {
        number: { decrement: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting character:", error);
    return NextResponse.json(
      { error: "Failed to delete character" },
      { status: 500 }
    );
  }
}
