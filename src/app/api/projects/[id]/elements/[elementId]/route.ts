import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string; elementId: string }>;
}

// DELETE /api/projects/[id]/elements/[elementId] - Delete an element
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, elementId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to delete elements" },
        { status: 403 }
      );
    }

    // Verify element belongs to this project
    const existingElement = await prisma.productionElement.findFirst({
      where: { id: elementId, projectId },
    });

    if (!existingElement) {
      return NextResponse.json(
        { error: "Element not found" },
        { status: 404 }
      );
    }

    // Delete the element (cascade will remove BreakdownElement references)
    await prisma.productionElement.delete({
      where: { id: elementId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting element:", error);
    return NextResponse.json(
      { error: "Failed to delete element" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/elements/[elementId] - Update an element
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, elementId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to edit elements" },
        { status: 403 }
      );
    }

    // Verify element belongs to this project
    const existingElement = await prisma.productionElement.findFirst({
      where: { id: elementId, projectId },
    });

    if (!existingElement) {
      return NextResponse.json(
        { error: "Element not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, notes } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Element name cannot be empty" },
          { status: 400 }
        );
      }

      // Check for duplicate (same project, category, and new name)
      const duplicate = await prisma.productionElement.findUnique({
        where: {
          projectId_category_name: {
            projectId,
            category: existingElement.category,
            name: name.trim(),
          },
        },
      });

      if (duplicate && duplicate.id !== elementId) {
        return NextResponse.json(
          { error: "An element with this name already exists in this category" },
          { status: 409 }
        );
      }

      updateData.name = name.trim();
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    const element = await prisma.productionElement.update({
      where: { id: elementId },
      data: updateData,
    });

    return NextResponse.json(element);
  } catch (error) {
    console.error("Error updating element:", error);
    return NextResponse.json(
      { error: "Failed to update element" },
      { status: 500 }
    );
  }
}
