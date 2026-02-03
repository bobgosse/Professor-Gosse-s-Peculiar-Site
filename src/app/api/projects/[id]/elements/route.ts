import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";
import { ElementCategory } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/elements - List all elements (optionally filtered by category)
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

    // Check for category filter in query params
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");

    const whereClause: { projectId: string; category?: ElementCategory } = {
      projectId,
    };

    if (categoryParam) {
      // Validate category enum
      if (!Object.values(ElementCategory).includes(categoryParam as ElementCategory)) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
      whereClause.category = categoryParam as ElementCategory;
    }

    const elements = await prisma.productionElement.findMany({
      where: whereClause,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(elements);
  } catch (error) {
    console.error("Error fetching elements:", error);
    return NextResponse.json(
      { error: "Failed to fetch elements" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/elements - Create a new element
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
        { error: "You don't have permission to create elements" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, name, notes } = body;

    // Validate category
    if (!category || !Object.values(ElementCategory).includes(category)) {
      return NextResponse.json(
        { error: "Valid category is required" },
        { status: 400 }
      );
    }

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Element name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate (same project, category, and name)
    const existing = await prisma.productionElement.findUnique({
      where: {
        projectId_category_name: {
          projectId,
          category,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An element with this name already exists in this category" },
        { status: 409 }
      );
    }

    const element = await prisma.productionElement.create({
      data: {
        projectId,
        category,
        name: name.trim(),
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(element, { status: 201 });
  } catch (error) {
    console.error("Error creating element:", error);
    return NextResponse.json(
      { error: "Failed to create element" },
      { status: 500 }
    );
  }
}
