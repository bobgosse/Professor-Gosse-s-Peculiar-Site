"use client";

import { useState, useMemo, Fragment } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Project, BreakdownElement, ElementCategory } from "@/hooks/useProject";
import type { Schedule } from "@/hooks/useSchedule";

// Map element category to display label
const CATEGORY_LABELS: Record<ElementCategory, string> = {
  WARDROBE: "Wardrobe",
  PROPS: "Props",
  SET_DRESSING: "Set Dressing",
  ART_DEPT: "Art Department",
  SPECIAL_PERSONNEL: "Special Personnel",
  VEHICLES: "Vehicles",
  CAMERA: "Camera",
  MECHANICAL_FX: "Mechanical FX",
  VISUAL_FX: "Visual FX",
  SPECIAL_EQUIP: "Special Equipment",
  ANIMALS: "Animals",
  SOUND_MUSIC: "Sound/Music",
  OTHER: "Other",
};
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportsTabProps {
  project: Project;
  schedule: Schedule | undefined;
}

type ReportType = "shooting" | "oneline" | "stripboard" | "dood" | "elements";

function parsePageCount(pageCount: string | null): number {
  if (!pageCount) return 0;
  const parts = pageCount.trim().split(" ");
  let total = 0;
  for (const part of parts) {
    if (part.includes("/")) {
      const [num, denom] = part.split("/").map(Number);
      total += num / denom;
    } else {
      total += Number(part) || 0;
    }
  }
  return total;
}

function formatPageCount(pages: number): string {
  const whole = Math.floor(pages);
  const fraction = pages - whole;
  const eighths = Math.round(fraction * 8);
  if (eighths === 0) return whole.toString();
  if (whole === 0) return `${eighths}/8`;
  return `${whole} ${eighths}/8`;
}

// PDF generation functions

// Parse date string as local date for PDF generation
function pdfParseLocalDate(dateStr: string): Date {
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function pdfFormatShootDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function pdfAddDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateShootingSchedulePDF(project: Project, schedule: Schedule) {
  const doc = new jsPDF();
  const strips = schedule.stripSlots;
  const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

  // Calculate shoot dates if startDate is set
  const startDate = schedule.startDate ? pdfParseLocalDate(schedule.startDate) : null;

  // Group strips by day
  const days: { dayNumber: number; strips: typeof strips; shootDate?: string }[] = [];
  let currentDay = 1;
  let currentDayStrips: typeof strips = [];

  strips.forEach((strip) => {
    currentDayStrips.push(strip);
    const dayBreak = dayBreakMap.get(strip.position);
    if (dayBreak) {
      const shootDate = startDate ? pdfFormatShootDate(pdfAddDays(startDate, currentDay - 1)) : undefined;
      days.push({ dayNumber: currentDay, strips: currentDayStrips, shootDate });
      currentDay++;
      currentDayStrips = [];
    }
  });
  if (currentDayStrips.length > 0) {
    const shootDate = startDate ? pdfFormatShootDate(pdfAddDays(startDate, currentDay - 1)) : undefined;
    days.push({ dayNumber: currentDay, strips: currentDayStrips, shootDate });
  }

  // Title
  doc.setFontSize(18);
  doc.text(project.title, 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("Shooting Schedule", 105, 28, { align: "center" });
  if (project.director) {
    doc.setFontSize(10);
    doc.text(`Director: ${project.director}`, 105, 35, { align: "center" });
  }

  let yPos = project.director ? 45 : 40;

  days.forEach((day) => {
    const dayPages = day.strips.reduce(
      (sum, s) => sum + parsePageCount(s.breakdown.pageCount),
      0
    );

    // Check if we need a new page for day header
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Day header with gold-ish background
    doc.setFillColor(180, 150, 80);
    doc.rect(14, yPos - 5, 182, 10, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    const dayLabel = day.shootDate ? `Day ${day.dayNumber} — ${day.shootDate}` : `Day ${day.dayNumber}`;
    doc.text(dayLabel, 16, yPos + 1);
    doc.text(`${formatPageCount(dayPages)} pages`, 190, yPos + 1, { align: "right" });
    doc.setTextColor(0, 0, 0);

    yPos += 12;

    // Each scene as a detailed block
    day.strips.forEach((strip) => {
      const bd = strip.breakdown;

      // Check if we need a new page
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Scene header bar
      doc.setFillColor(70, 70, 70);
      doc.rect(14, yPos - 4, 182, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`${bd.sceneNumbers}`, 16, yPos + 1);
      doc.setFontSize(8);
      doc.text(`${bd.intExt || "—"} / ${bd.dayNight || "—"}`, 40, yPos + 1);
      doc.text(bd.location || "—", 70, yPos + 1);
      doc.text(`${bd.pageCount || "—"} pgs`, 170, yPos + 1);
      if (bd.storyDay) {
        doc.text(`SD ${bd.storyDay}`, 190, yPos + 1, { align: "right" });
      }
      doc.setTextColor(0, 0, 0);

      yPos += 8;

      // Description
      if (bd.description) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        const descLines = doc.splitTextToSize(bd.description, 176);
        doc.text(descLines, 18, yPos);
        yPos += descLines.length * 4 + 2;
        doc.setFont("helvetica", "normal");
      }

      // Cast with numbers and names
      if (bd.cast.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Cast:", 18, yPos);
        doc.setTextColor(0, 0, 0);
        const castText = bd.cast.map((c) => `#${c.character.number} ${c.character.name}`).join(", ");
        const castLines = doc.splitTextToSize(castText, 150);
        doc.text(castLines, 38, yPos);
        yPos += castLines.length * 3.5 + 2;
      }

      // Department fields helper
      const addField = (label: string, value: string | null) => {
        if (!value) return;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`${label}:`, 18, yPos);
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(value, 140);
        doc.text(lines, 50, yPos);
        yPos += lines.length * 3.5 + 1;
      };

      addField("Extras", bd.extras);
      addField("Stunts", bd.stunts);
      addField("Wardrobe", bd.wardrobe);
      addField("Props", bd.props);
      addField("Set Dressing", bd.setDressing);
      addField("Art Dept", bd.artDept);
      addField("Special Personnel", bd.specialPersonnel);
      addField("Vehicles", bd.vehicles);
      addField("Camera", bd.camera);
      addField("Mechanical FX", bd.mechanicalFx);
      addField("Visual FX", bd.visualFx);
      addField("Special Equip", bd.specialEquip);
      addField("Animals", bd.animals);
      addField("Sound/Music", bd.soundMusic);
      addField("Other", bd.other);
      addField("DQs", bd.dqs);

      yPos += 6; // Space between scenes
    });

    yPos += 4; // Space between days
  });

  doc.save(`${project.title.replace(/[^a-z0-9]/gi, "_")}_Shooting_Schedule.pdf`);
}

function generateOneLinePDF(project: Project, schedule: Schedule) {
  const doc = new jsPDF();
  const strips = schedule.stripSlots;
  const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

  // Title
  doc.setFontSize(18);
  doc.text(project.title, 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("One-Line Schedule", 105, 28, { align: "center" });

  let currentDay = 1;
  const tableData = strips.map((strip) => {
    const row = [
      currentDay.toString(),
      strip.breakdown.sceneNumbers,
      strip.breakdown.intExt || "—",
      strip.breakdown.dayNight?.charAt(0) || "—",
      `${strip.breakdown.location || ""}${strip.breakdown.description ? ` - ${strip.breakdown.description}` : ""}`,
      strip.breakdown.pageCount || "—",
    ];
    if (dayBreakMap.has(strip.position)) {
      currentDay++;
    }
    return row;
  });

  autoTable(doc, {
    startY: 40,
    head: [["Day", "Scene", "I/E", "D/N", "Location - Description", "Pages"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [80, 80, 80], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 18 },
      2: { cellWidth: 12 },
      3: { cellWidth: 12 },
      4: { cellWidth: 110 },
      5: { cellWidth: 15, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${project.title.replace(/[^a-z0-9]/gi, "_")}_One_Line_Schedule.pdf`);
}

function generateDOODPDF(project: Project, schedule: Schedule) {
  const doc = new jsPDF({ orientation: "landscape" });
  const characters = project.characters;
  const strips = schedule.stripSlots;
  const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

  // Group strips by day
  const days: typeof strips[] = [];
  let currentDayStrips: typeof strips = [];
  strips.forEach((strip) => {
    currentDayStrips.push(strip);
    if (dayBreakMap.has(strip.position)) {
      days.push(currentDayStrips);
      currentDayStrips = [];
    }
  });
  if (currentDayStrips.length > 0) {
    days.push(currentDayStrips);
  }

  // Title
  doc.setFontSize(18);
  doc.text(project.title, 148, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text("Day Out of Days", 148, 23, { align: "center" });

  // Build table data
  const headers = ["#", "Character", ...days.map((_, i) => `${i + 1}`), "Total"];
  const tableData = characters.map((char) => {
    const statuses: string[] = [];
    let hasStarted = false;
    let lastWorkDay = -1;

    days.forEach((dayStrips, dayIndex) => {
      const worksToday = dayStrips.some((s) =>
        s.breakdown.cast.some((c) => c.characterId === char.id)
      );
      if (worksToday) {
        if (!hasStarted) {
          statuses.push("SW");
          hasStarted = true;
        } else {
          statuses.push("W");
        }
        lastWorkDay = dayIndex;
      } else if (hasStarted) {
        statuses.push("H");
      } else {
        statuses.push("");
      }
    });

    if (lastWorkDay >= 0 && statuses[lastWorkDay] !== "SW") {
      statuses[lastWorkDay] = "WF";
    } else if (lastWorkDay >= 0) {
      statuses[lastWorkDay] = "SWF";
    }
    for (let i = lastWorkDay + 1; i < statuses.length; i++) {
      statuses[i] = "";
    }

    const workDays = statuses.filter((s) => ["W", "SW", "WF", "SWF"].includes(s)).length;

    return [char.number.toString(), char.name, ...statuses, workDays.toString()];
  });

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [80, 80, 80], fontSize: 7, halign: "center" },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 30 },
      ...Object.fromEntries(
        days.map((_, i) => [i + 2, { cellWidth: 8, halign: "center" }])
      ),
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      const cellText = String(data.cell.raw);
      if (["W", "SW", "WF", "SWF"].includes(cellText)) {
        data.cell.styles.textColor = [34, 197, 94]; // green
      } else if (cellText === "H") {
        data.cell.styles.textColor = [234, 179, 8]; // yellow
      }
    },
  });

  // Legend
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.text("SW = Start/Work   W = Work   WF = Work/Finish   H = Hold", 10, finalY);

  doc.save(`${project.title.replace(/[^a-z0-9]/gi, "_")}_Day_Out_of_Days.pdf`);
}

function generateElementsPDF(project: Project) {
  const doc = new jsPDF();
  const breakdowns = project.breakdowns;

  // Collect elements by category
  const elements: Record<ElementCategory, Map<string, string[]>> = {
    WARDROBE: new Map(),
    PROPS: new Map(),
    SET_DRESSING: new Map(),
    ART_DEPT: new Map(),
    SPECIAL_PERSONNEL: new Map(),
    VEHICLES: new Map(),
    CAMERA: new Map(),
    MECHANICAL_FX: new Map(),
    VISUAL_FX: new Map(),
    SPECIAL_EQUIP: new Map(),
    ANIMALS: new Map(),
    SOUND_MUSIC: new Map(),
    OTHER: new Map(),
  };

  breakdowns.forEach((bd) => {
    // Use new element library relations if available
    if (bd.elements && bd.elements.length > 0) {
      bd.elements.forEach((be: BreakdownElement) => {
        const category = be.element.category;
        const name = be.element.name;
        const map = elements[category];
        if (!map.has(name)) {
          map.set(name, []);
        }
        map.get(name)!.push(bd.sceneNumbers);
      });
    }

    // Also include legacy text fields for backwards compatibility
    const addLegacyItems = (category: ElementCategory, text: string | null) => {
      if (!text) return;
      const items = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      items.forEach((item) => {
        const map = elements[category];
        if (!map.has(item)) {
          map.set(item, []);
        }
        if (!map.get(item)!.includes(bd.sceneNumbers)) {
          map.get(item)!.push(bd.sceneNumbers);
        }
      });
    };

    addLegacyItems("PROPS", bd.props);
    addLegacyItems("WARDROBE", bd.wardrobe);
    addLegacyItems("VEHICLES", bd.vehicles);
    addLegacyItems("ANIMALS", bd.animals);
    addLegacyItems("SPECIAL_EQUIP", bd.specialEquip);
    addLegacyItems("MECHANICAL_FX", bd.mechanicalFx);
    addLegacyItems("VISUAL_FX", bd.visualFx);
    addLegacyItems("SET_DRESSING", bd.setDressing);
    addLegacyItems("ART_DEPT", bd.artDept);
    addLegacyItems("SPECIAL_PERSONNEL", bd.specialPersonnel);
    addLegacyItems("CAMERA", bd.camera);
    addLegacyItems("SOUND_MUSIC", bd.soundMusic);
    addLegacyItems("OTHER", bd.other);
  });

  const categories: ElementCategory[] = [
    "PROPS",
    "WARDROBE",
    "VEHICLES",
    "ANIMALS",
    "SPECIAL_EQUIP",
    "MECHANICAL_FX",
    "VISUAL_FX",
    "SET_DRESSING",
    "ART_DEPT",
    "SPECIAL_PERSONNEL",
    "CAMERA",
    "SOUND_MUSIC",
    "OTHER",
  ];

  // Title
  doc.setFontSize(18);
  doc.text(project.title, 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("Element Breakdowns", 105, 28, { align: "center" });

  let yPos = 40;

  categories.forEach((category) => {
    const items = elements[category];
    if (items.size === 0) return;

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    const tableData = Array.from(items.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([item, scenes]) => [item, scenes.join(", ")]);

    // Category header
    doc.setFillColor(60, 60, 60);
    doc.rect(14, yPos - 5, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(CATEGORY_LABELS[category], 16, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Item", "Scenes"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [80, 80, 80], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 100 },
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  });

  doc.save(`${project.title.replace(/[^a-z0-9]/gi, "_")}_Element_Breakdowns.pdf`);
}

function generateStripBoardPDF(project: Project, schedule: Schedule) {
  const doc = new jsPDF({ orientation: "landscape" });
  const strips = schedule.stripSlots;
  const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

  // Title
  doc.setFontSize(18);
  doc.text(project.title, 148, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text("Strip Board", 148, 23, { align: "center" });

  // Color functions for PDF (return RGB values)
  const getStripColor = (intExt: string | null, dayNight: string | null): [number, number, number] => {
    if (dayNight === "DAY" || dayNight === "DAWN" || dayNight === "DUSK") {
      return intExt === "EXT" ? [253, 224, 71] : [255, 255, 255]; // Yellow / White
    }
    if (dayNight === "NIGHT" || dayNight === "DAY_FOR_NIGHT") {
      return intExt === "EXT" ? [59, 130, 246] : [34, 197, 94]; // Blue / Green
    }
    return [200, 200, 200]; // Gray
  };

  const getTextColor = (intExt: string | null, dayNight: string | null): [number, number, number] => {
    if (dayNight === "NIGHT" || dayNight === "DAY_FOR_NIGHT") {
      return [255, 255, 255]; // White text on dark colors
    }
    return [0, 0, 0]; // Black text
  };

  let yPos = 35;
  let lastDayBreakPos = 0;

  // Build rows with day breaks interspersed
  const rows: { type: "strip" | "daybreak"; data: unknown }[] = [];

  strips.forEach((strip) => {
    rows.push({ type: "strip", data: strip });
    const dayBreak = dayBreakMap.get(strip.position);
    if (dayBreak) {
      const pages = strips
        .filter((s) => s.position > lastDayBreakPos && s.position <= strip.position)
        .reduce((sum, s) => sum + parsePageCount(s.breakdown.pageCount), 0);
      rows.push({ type: "daybreak", data: { dayBreak, totalPages: formatPageCount(pages) } });
      lastDayBreakPos = strip.position;
    }
  });

  // Header row
  doc.setFillColor(60, 60, 60);
  doc.rect(10, yPos, 277, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Scene", 12, yPos + 5);
  doc.text("I/E", 35, yPos + 5);
  doc.text("D/N", 50, yPos + 5);
  doc.text("Location", 65, yPos + 5);
  doc.text("Description", 130, yPos + 5);
  doc.text("Pages", 220, yPos + 5);
  doc.text("Cast #", 245, yPos + 5);
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  rows.forEach((row) => {
    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
      // Repeat header
      doc.setFillColor(60, 60, 60);
      doc.rect(10, yPos, 277, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("Scene", 12, yPos + 5);
      doc.text("I/E", 35, yPos + 5);
      doc.text("D/N", 50, yPos + 5);
      doc.text("Location", 65, yPos + 5);
      doc.text("Description", 130, yPos + 5);
      doc.text("Pages", 220, yPos + 5);
      doc.text("Cast #", 245, yPos + 5);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }

    if (row.type === "strip") {
      const strip = row.data as typeof strips[0];
      const bgColor = getStripColor(strip.breakdown.intExt, strip.breakdown.dayNight);
      const txtColor = getTextColor(strip.breakdown.intExt, strip.breakdown.dayNight);

      doc.setFillColor(...bgColor);
      doc.rect(10, yPos, 277, 7, "F");
      doc.setTextColor(...txtColor);
      doc.setFontSize(7);

      doc.text(strip.breakdown.sceneNumbers || "", 12, yPos + 5);
      doc.text(strip.breakdown.intExt || "", 35, yPos + 5);
      doc.text(strip.breakdown.dayNight?.charAt(0) || "", 50, yPos + 5);
      doc.text((strip.breakdown.location || "").substring(0, 40), 65, yPos + 5);
      doc.text((strip.breakdown.description || "").substring(0, 50), 130, yPos + 5);
      doc.text(strip.breakdown.pageCount || "", 220, yPos + 5);
      const castNumbers = strip.breakdown.cast
        .map((c) => c.character.number)
        .sort((a, b) => a - b)
        .join(", ");
      doc.text(castNumbers || "", 245, yPos + 5);

      yPos += 8;
    } else {
      const { dayBreak, totalPages } = row.data as { dayBreak: { dayNumber: number }; totalPages: string };
      doc.setFillColor(168, 85, 247); // Purple for day break
      doc.rect(10, yPos, 277, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(`END OF DAY ${dayBreak.dayNumber}`, 12, yPos + 5);
      doc.text(`${totalPages} pages`, 245, yPos + 5);
      yPos += 10;
    }

    doc.setTextColor(0, 0, 0);
  });

  // Legend
  yPos += 5;
  if (yPos > 170) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(8);
  doc.text("Legend:", 10, yPos);
  yPos += 6;

  const legendItems = [
    { color: [253, 224, 71] as [number, number, number], label: "Day/EXT" },
    { color: [255, 255, 255] as [number, number, number], label: "Day/INT" },
    { color: [59, 130, 246] as [number, number, number], label: "Night/EXT" },
    { color: [34, 197, 94] as [number, number, number], label: "Night/INT" },
  ];

  let xPos = 10;
  legendItems.forEach(({ color, label }) => {
    doc.setFillColor(...color);
    doc.rect(xPos, yPos - 3, 10, 5, "F");
    doc.setTextColor(100, 100, 100);
    doc.text(label, xPos + 12, yPos);
    xPos += 40;
  });

  doc.save(`${project.title.replace(/[^a-z0-9]/gi, "_")}_Strip_Board.pdf`);
}

// Helper component for department fields in shooting schedule
function DepartmentField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-stone-500 font-medium min-w-24">{label}:</span>
      <span className="text-stone-300">{value}</span>
    </div>
  );
}

// Parse date string as local date (not UTC) to avoid timezone offset issues
function parseLocalDate(dateStr: string): Date {
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatShootDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function ShootingScheduleReport({
  project,
  schedule,
}: {
  project: Project;
  schedule: Schedule | undefined;
}) {
  if (!schedule || schedule.stripSlots.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        No scenes scheduled yet.
      </div>
    );
  }

  const strips = schedule.stripSlots;
  const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

  // Calculate shoot dates if startDate is set
  const startDate = schedule.startDate ? parseLocalDate(schedule.startDate) : null;

  // Group strips by day
  const days: { dayNumber: number; strips: typeof strips; shootDate?: string }[] = [];
  let currentDay = 1;
  let currentDayStrips: typeof strips = [];

  strips.forEach((strip) => {
    currentDayStrips.push(strip);
    const dayBreak = dayBreakMap.get(strip.position);
    if (dayBreak) {
      const shootDate = startDate ? formatShootDate(addDays(startDate, currentDay - 1)) : undefined;
      days.push({ dayNumber: currentDay, strips: currentDayStrips, shootDate });
      currentDay++;
      currentDayStrips = [];
    }
  });

  // Add remaining strips as last day
  if (currentDayStrips.length > 0) {
    const shootDate = startDate ? formatShootDate(addDays(startDate, currentDay - 1)) : undefined;
    days.push({ dayNumber: currentDay, strips: currentDayStrips, shootDate });
  }

  return (
    <div className="space-y-8">
      <div className="text-center border-b border-stone-800 pb-4">
        <h3 className="text-xl font-display text-gold">{project.title}</h3>
        <p className="text-stone-400">Shooting Schedule</p>
        {project.director && <p className="text-stone-500 text-sm">Director: {project.director}</p>}
      </div>

      {days.map((day) => {
        const dayPages = day.strips.reduce(
          (sum, s) => sum + parsePageCount(s.breakdown.pageCount),
          0
        );

        return (
          <div key={day.dayNumber} className="space-y-4">
            {/* Day Header */}
            <div className="bg-gold/20 border border-gold/40 rounded-lg px-4 py-3 flex justify-between items-center">
              <div>
                <span className="font-bold text-gold text-lg">Day {day.dayNumber}</span>
                {day.shootDate && (
                  <span className="text-stone-400 ml-3">— {day.shootDate}</span>
                )}
              </div>
              <span className="font-mono text-gold">{formatPageCount(dayPages)} pages</span>
            </div>

            {/* Scene Cards */}
            {day.strips.map((strip) => {
              const bd = strip.breakdown;
              return (
                <div key={strip.id} className="border border-stone-700 rounded-lg overflow-hidden">
                  {/* Scene Header */}
                  <div className="bg-stone-800 px-4 py-2 flex items-center gap-4 text-sm">
                    <span className="font-mono font-bold text-lg">{bd.sceneNumbers}</span>
                    <span className="text-stone-400">{bd.intExt || "—"}</span>
                    <span className="text-stone-400">{bd.dayNight || "—"}</span>
                    <span className="font-medium flex-1">{bd.location || "—"}</span>
                    <span className="font-mono">{bd.pageCount || "—"} pgs</span>
                    {bd.storyDay && (
                      <span className="text-stone-500">Story Day {bd.storyDay}</span>
                    )}
                  </div>

                  {/* Scene Content */}
                  <div className="p-4 space-y-3 bg-stone-900/50">
                    {/* Description */}
                    {bd.description && (
                      <p className="text-stone-300 italic">{bd.description}</p>
                    )}

                    {/* Cast */}
                    {bd.cast.length > 0 && (
                      <div className="flex gap-2 text-sm">
                        <span className="text-stone-500 font-medium min-w-24">Cast:</span>
                        <span className="text-stone-300">
                          {bd.cast
                            .map((c) => `#${c.character.number} ${c.character.name}`)
                            .join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Extras */}
                    <DepartmentField label="Extras" value={bd.extras} />

                    {/* Stunts */}
                    <DepartmentField label="Stunts" value={bd.stunts} />

                    {/* Department Fields */}
                    <DepartmentField label="Wardrobe" value={bd.wardrobe} />
                    <DepartmentField label="Props" value={bd.props} />
                    <DepartmentField label="Set Dressing" value={bd.setDressing} />
                    <DepartmentField label="Art Dept" value={bd.artDept} />
                    <DepartmentField label="Special Personnel" value={bd.specialPersonnel} />
                    <DepartmentField label="Vehicles" value={bd.vehicles} />
                    <DepartmentField label="Camera" value={bd.camera} />
                    <DepartmentField label="Mechanical FX" value={bd.mechanicalFx} />
                    <DepartmentField label="Visual FX" value={bd.visualFx} />
                    <DepartmentField label="Special Equip" value={bd.specialEquip} />
                    <DepartmentField label="Animals" value={bd.animals} />
                    <DepartmentField label="Sound/Music" value={bd.soundMusic} />
                    <DepartmentField label="Other" value={bd.other} />
                    <DepartmentField label="DQs" value={bd.dqs} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function OneLineScheduleReport({
  project,
  schedule,
}: {
  project: Project;
  schedule: Schedule | undefined;
}) {
  if (!schedule || schedule.stripSlots.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        No scenes scheduled yet.
      </div>
    );
  }

  const strips = schedule.stripSlots;
  const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

  let currentDay = 1;

  return (
    <div className="space-y-4">
      <div className="text-center border-b border-stone-800 pb-4">
        <h3 className="text-xl font-display text-gold">{project.title}</h3>
        <p className="text-stone-400">One-Line Schedule</p>
      </div>

      <table className="w-full text-sm font-mono">
        <thead className="text-stone-400 text-left">
          <tr className="border-b border-stone-800">
            <th className="py-2 w-12">Day</th>
            <th className="py-2 w-16">Scene</th>
            <th className="py-2 w-12">I/E</th>
            <th className="py-2 w-12">D/N</th>
            <th className="py-2">Location - Description</th>
            <th className="py-2 w-16 text-right">Pages</th>
          </tr>
        </thead>
        <tbody>
          {strips.map((strip) => {
            const dayBreak = dayBreakMap.get(strip.position);
            const row = (
              <tr key={strip.id} className="border-b border-stone-800/50">
                <td className="py-1 text-gold">{currentDay}</td>
                <td className="py-1">{strip.breakdown.sceneNumbers}</td>
                <td className="py-1">{strip.breakdown.intExt || "—"}</td>
                <td className="py-1">{strip.breakdown.dayNight?.charAt(0) || "—"}</td>
                <td className="py-1">
                  {strip.breakdown.location}
                  {strip.breakdown.description && ` - ${strip.breakdown.description}`}
                </td>
                <td className="py-1 text-right">{strip.breakdown.pageCount || "—"}</td>
              </tr>
            );

            if (dayBreak) {
              currentDay++;
            }

            return row;
          })}
        </tbody>
      </table>
    </div>
  );
}

function DayOutOfDaysReport({
  project,
  schedule,
}: {
  project: Project;
  schedule: Schedule | undefined;
}) {
  const characters = project.characters;

  // Build DOOD matrix: which characters work which days
  const dood = useMemo(() => {
    if (!schedule || schedule.stripSlots.length === 0) return null;

    const strips = schedule.stripSlots;
    const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

    // Group strips by day
    const days: typeof strips[] = [];
    let currentDayStrips: typeof strips = [];

    strips.forEach((strip) => {
      currentDayStrips.push(strip);
      if (dayBreakMap.has(strip.position)) {
        days.push(currentDayStrips);
        currentDayStrips = [];
      }
    });
    if (currentDayStrips.length > 0) {
      days.push(currentDayStrips);
    }

    // For each character, compute their work status per day
    // W = Work, H = Hold, SW = Start/Work, WF = Work/Finish
    const matrix: Map<string, string[]> = new Map();

    characters.forEach((char) => {
      const status: string[] = [];
      let hasStarted = false;
      let lastWorkDay = -1;

      days.forEach((dayStrips, dayIndex) => {
        const worksToday = dayStrips.some((s) =>
          s.breakdown.cast.some((c) => c.characterId === char.id)
        );

        if (worksToday) {
          if (!hasStarted) {
            status.push("SW"); // Start/Work
            hasStarted = true;
          } else {
            status.push("W"); // Work
          }
          lastWorkDay = dayIndex;
        } else if (hasStarted) {
          status.push("H"); // Hold
        } else {
          status.push(""); // Not started
        }
      });

      // Mark last work day as WF if they started
      if (lastWorkDay >= 0 && status[lastWorkDay] !== "SW") {
        status[lastWorkDay] = "WF";
      } else if (lastWorkDay >= 0) {
        status[lastWorkDay] = "SWF"; // Start, Work, Finish same day
      }

      // Clear holds after finish
      for (let i = lastWorkDay + 1; i < status.length; i++) {
        status[i] = "";
      }

      matrix.set(char.id, status);
    });

    return { days, matrix };
  }, [schedule, characters]);

  if (!dood) {
    return (
      <div className="text-center py-8 text-stone-500">
        No schedule data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center border-b border-stone-800 pb-4">
        <h3 className="text-xl font-display text-gold">{project.title}</h3>
        <p className="text-stone-400">Day Out of Days</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-stone-400">
            <tr className="border-b border-stone-800">
              <th className="py-2 px-3 text-left sticky left-0 bg-stone-950">#</th>
              <th className="py-2 px-3 text-left sticky left-8 bg-stone-950">Character</th>
              {dood.days.map((_, i) => (
                <th key={i} className="py-2 px-2 text-center w-10">
                  {i + 1}
                </th>
              ))}
              <th className="py-2 px-3 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((char) => {
              const statuses = dood.matrix.get(char.id) || [];
              const workDays = statuses.filter((s) =>
                ["W", "SW", "WF", "SWF"].includes(s)
              ).length;

              return (
                <tr key={char.id} className="border-b border-stone-800/50">
                  <td className="py-1 px-3 font-mono text-gold sticky left-0 bg-stone-950">
                    {char.number}
                  </td>
                  <td className="py-1 px-3 sticky left-8 bg-stone-950">{char.name}</td>
                  {statuses.map((status, i) => (
                    <td
                      key={i}
                      className={`py-1 px-2 text-center text-xs font-mono ${
                        status === "W" || status === "SW" || status === "WF" || status === "SWF"
                          ? "text-green-400"
                          : status === "H"
                          ? "text-yellow-400"
                          : "text-stone-700"
                      }`}
                    >
                      {status || "·"}
                    </td>
                  ))}
                  <td className="py-1 px-3 text-center font-mono">{workDays}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-6 text-xs text-stone-500 mt-4">
        <span><span className="text-green-400">SW</span> = Start/Work</span>
        <span><span className="text-green-400">W</span> = Work</span>
        <span><span className="text-green-400">WF</span> = Work/Finish</span>
        <span><span className="text-yellow-400">H</span> = Hold</span>
      </div>
    </div>
  );
}

function ElementBreakdownsReport({ project }: { project: Project }) {
  const breakdowns = project.breakdowns;

  // Collect all elements by category from element library relations
  const elementsByCategory = useMemo(() => {
    const collected: Record<ElementCategory, Map<string, string[]>> = {
      WARDROBE: new Map(),
      PROPS: new Map(),
      SET_DRESSING: new Map(),
      ART_DEPT: new Map(),
      SPECIAL_PERSONNEL: new Map(),
      VEHICLES: new Map(),
      CAMERA: new Map(),
      MECHANICAL_FX: new Map(),
      VISUAL_FX: new Map(),
      SPECIAL_EQUIP: new Map(),
      ANIMALS: new Map(),
      SOUND_MUSIC: new Map(),
      OTHER: new Map(),
    };

    breakdowns.forEach((bd) => {
      // Use new element library relations if available
      if (bd.elements && bd.elements.length > 0) {
        bd.elements.forEach((be: BreakdownElement) => {
          const category = be.element.category;
          const name = be.element.name;
          const map = collected[category];
          if (!map.has(name)) {
            map.set(name, []);
          }
          map.get(name)!.push(bd.sceneNumbers);
        });
      }

      // Also include legacy text fields for backwards compatibility
      const addLegacyItems = (category: ElementCategory, text: string | null) => {
        if (!text) return;
        const items = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
        items.forEach((item) => {
          const map = collected[category];
          if (!map.has(item)) {
            map.set(item, []);
          }
          if (!map.get(item)!.includes(bd.sceneNumbers)) {
            map.get(item)!.push(bd.sceneNumbers);
          }
        });
      };

      addLegacyItems("PROPS", bd.props);
      addLegacyItems("WARDROBE", bd.wardrobe);
      addLegacyItems("VEHICLES", bd.vehicles);
      addLegacyItems("ANIMALS", bd.animals);
      addLegacyItems("SPECIAL_EQUIP", bd.specialEquip);
      addLegacyItems("MECHANICAL_FX", bd.mechanicalFx);
      addLegacyItems("VISUAL_FX", bd.visualFx);
      addLegacyItems("SET_DRESSING", bd.setDressing);
      addLegacyItems("ART_DEPT", bd.artDept);
      addLegacyItems("SPECIAL_PERSONNEL", bd.specialPersonnel);
      addLegacyItems("CAMERA", bd.camera);
      addLegacyItems("SOUND_MUSIC", bd.soundMusic);
      addLegacyItems("OTHER", bd.other);
    });

    return collected;
  }, [breakdowns]);

  const categories: ElementCategory[] = [
    "PROPS",
    "WARDROBE",
    "VEHICLES",
    "ANIMALS",
    "SPECIAL_EQUIP",
    "MECHANICAL_FX",
    "VISUAL_FX",
    "SET_DRESSING",
    "ART_DEPT",
    "SPECIAL_PERSONNEL",
    "CAMERA",
    "SOUND_MUSIC",
    "OTHER",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-stone-800 pb-4">
        <h3 className="text-xl font-display text-gold">{project.title}</h3>
        <p className="text-stone-400">Element Breakdowns</p>
      </div>

      {categories.map((category) => {
        const items = elementsByCategory[category];
        if (items.size === 0) return null;

        return (
          <div key={category} className="border border-stone-800 rounded-lg overflow-hidden">
            <div className="bg-stone-800 px-4 py-2 font-bold">{CATEGORY_LABELS[category]}</div>
            <table className="w-full text-sm">
              <thead className="bg-stone-900 text-stone-400">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Scenes</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(items.entries())
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([item, scenes]) => (
                    <tr key={item} className="border-t border-stone-800/50">
                      <td className="px-3 py-2">{item}</td>
                      <td className="px-3 py-2 font-mono text-stone-400">
                        {scenes.join(", ")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {Object.values(elementsByCategory).every((m) => m.size === 0) && (
        <div className="text-center py-8 text-stone-500">
          No element data in breakdowns.
        </div>
      )}
    </div>
  );
}

function StripBoardReport({
  project,
  schedule,
}: {
  project: Project;
  schedule: Schedule | undefined;
}) {
  if (!schedule || schedule.stripSlots.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        No scenes scheduled yet.
      </div>
    );
  }

  const strips = schedule.stripSlots;
  const dayBreakMap = new Map(schedule.dayBreaks.map((db) => [db.afterPosition, db]));

  const getStripColorClass = (intExt: string | null, dayNight: string | null): string => {
    if (dayNight === "DAY" || dayNight === "DAWN" || dayNight === "DUSK") {
      return intExt === "EXT" ? "bg-yellow-300 text-stone-900" : "bg-white text-stone-900";
    }
    if (dayNight === "NIGHT" || dayNight === "DAY_FOR_NIGHT") {
      return intExt === "EXT" ? "bg-blue-500 text-white" : "bg-green-500 text-white";
    }
    return "bg-stone-300 text-stone-900";
  };

  // Calculate pages per day
  let lastDayBreakPos = 0;

  return (
    <div className="space-y-4">
      <div className="text-center border-b border-stone-800 pb-4">
        <h3 className="text-xl font-display text-gold">{project.title}</h3>
        <p className="text-stone-400">Strip Board</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-300" />
          <span className="text-stone-400">Day/EXT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white border border-stone-600" />
          <span className="text-stone-400">Day/INT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-stone-400">Night/EXT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-stone-400">Night/INT</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 px-3 py-2 text-xs text-stone-500 font-medium border-b border-stone-700">
        <div className="w-14">Scene</div>
        <div className="w-10">I/E</div>
        <div className="w-10">D/N</div>
        <div className="flex-1">Location</div>
        <div className="flex-1">Description</div>
        <div className="w-14 text-right">Pages</div>
        <div className="w-20">Cast #</div>
      </div>

      <div className="space-y-1">
        {strips.map((strip) => {
          const dayBreak = dayBreakMap.get(strip.position);
          const colorClass = getStripColorClass(strip.breakdown.intExt, strip.breakdown.dayNight);

          const elements = (
            <Fragment key={strip.id}>
              <div
                className={`flex items-center gap-4 px-3 py-2 text-sm rounded ${colorClass}`}
              >
                <div className="w-14 font-mono font-bold">{strip.breakdown.sceneNumbers}</div>
                <div className="w-10 text-xs">{strip.breakdown.intExt || "—"}</div>
                <div className="w-10 text-xs">{strip.breakdown.dayNight?.charAt(0) || "—"}</div>
                <div className="flex-1 truncate font-medium">{strip.breakdown.location || "—"}</div>
                <div className="flex-1 truncate text-xs opacity-75">{strip.breakdown.description || ""}</div>
                <div className="w-14 font-mono text-right">{strip.breakdown.pageCount || "—"}</div>
                <div className="w-20 text-xs">
                  {strip.breakdown.cast
                    .map((c) => c.character.number)
                    .sort((a, b) => a - b)
                    .join(", ") || "—"}
                </div>
              </div>
              {dayBreak && (
                <div className="bg-purple-600 text-white rounded px-4 py-2 flex items-center justify-between">
                  <span className="font-bold">END OF DAY {dayBreak.dayNumber}</span>
                  <span className="font-mono">
                    {formatPageCount(
                      strips
                        .filter((s) => s.position > lastDayBreakPos && s.position <= strip.position)
                        .reduce((sum, s) => sum + parsePageCount(s.breakdown.pageCount), 0)
                    )}{" "}
                    pages
                  </span>
                </div>
              )}
            </Fragment>
          );

          if (dayBreak) {
            lastDayBreakPos = strip.position;
          }

          return elements;
        })}
      </div>
    </div>
  );
}

export function ReportsTab({ project, schedule }: ReportsTabProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("shooting");
  const [isGenerating, setIsGenerating] = useState(false);

  const reports: { id: ReportType; label: string }[] = [
    { id: "shooting", label: "Shooting Schedule" },
    { id: "oneline", label: "One-Line Schedule" },
    { id: "stripboard", label: "Strip Board" },
    { id: "dood", label: "Day Out of Days" },
    { id: "elements", label: "Element Breakdowns" },
  ];

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      switch (activeReport) {
        case "shooting":
          if (schedule && schedule.stripSlots.length > 0) {
            generateShootingSchedulePDF(project, schedule);
          }
          break;
        case "oneline":
          if (schedule && schedule.stripSlots.length > 0) {
            generateOneLinePDF(project, schedule);
          }
          break;
        case "stripboard":
          if (schedule && schedule.stripSlots.length > 0) {
            generateStripBoardPDF(project, schedule);
          }
          break;
        case "dood":
          if (schedule && schedule.stripSlots.length > 0) {
            generateDOODPDF(project, schedule);
          }
          break;
        case "elements":
          generateElementsPDF(project);
          break;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const canDownload =
    activeReport === "elements"
      ? project.breakdowns.length > 0
      : schedule && schedule.stripSlots.length > 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display text-gold">Reports</h2>
          {canDownload && (
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-dark text-stone-950 font-medium rounded transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download PDF
            </button>
          )}
        </div>

        {/* Report tabs */}
        <div className="flex gap-2 border-b border-stone-800">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeReport === report.id
                  ? "text-gold border-b-2 border-gold -mb-px"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {report.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        {activeReport === "shooting" && (
          <ShootingScheduleReport project={project} schedule={schedule} />
        )}
        {activeReport === "oneline" && (
          <OneLineScheduleReport project={project} schedule={schedule} />
        )}
        {activeReport === "stripboard" && (
          <StripBoardReport project={project} schedule={schedule} />
        )}
        {activeReport === "dood" && (
          <DayOutOfDaysReport project={project} schedule={schedule} />
        )}
        {activeReport === "elements" && (
          <ElementBreakdownsReport project={project} />
        )}
      </div>
    </div>
  );
}
