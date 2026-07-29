import { jsPDF } from "jspdf";
import type { PublicAssignment } from "./public-assignment";

type RGB = [number, number, number];

const colors = {
  navy: [25, 61, 111] as RGB,
  blue: [36, 87, 167] as RGB,
  paleBlue: [238, 244, 253] as RGB,
  green: [22, 101, 52] as RGB,
  paleGreen: [232, 247, 237] as RGB,
  ink: [28, 37, 51] as RGB,
  muted: [91, 104, 122] as RGB,
  line: [218, 225, 235] as RGB,
  white: [255, 255, 255] as RGB,
};

const text = (value: unknown) => String(value ?? "").trim() || "-";

export function buildAssignmentPdf(
  assignment: PublicAssignment,
  fontBase64: string,
) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.addFileToVFS("Sarabun-Regular.ttf", fontBase64);
  pdf.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
  pdf.setFont("Sarabun", "normal");

  const width = 210;
  const margin = 16;
  const contentWidth = width - margin * 2;
  let y = 0;

  const fill = (color: RGB) => pdf.setFillColor(...color);
  const stroke = (color: RGB) => pdf.setDrawColor(...color);
  const color = (value: RGB) => pdf.setTextColor(...value);
  const label = (value: string, x: number, top: number) => {
    color(colors.muted);
    pdf.setFontSize(8);
    pdf.text(value.toUpperCase(), x, top);
  };
  const value = (
    content: unknown,
    x: number,
    top: number,
    maxWidth: number,
  ) => {
    color(colors.ink);
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(text(content), maxWidth);
    pdf.text(lines, x, top);
    return lines.length * 5;
  };
  const sectionTitle = (title: string, top: number) => {
    color(colors.navy);
    pdf.setFontSize(12);
    pdf.text(title, margin, top);
    stroke(colors.line);
    pdf.line(margin, top + 3, width - margin, top + 3);
  };

  fill(colors.navy);
  pdf.rect(0, 0, width, 35, "F");
  fill(colors.white);
  pdf.roundedRect(margin, 8, 18, 18, 2, 2, "F");
  color(colors.navy);
  pdf.setFontSize(11);
  pdf.text("TT", margin + 5, 20);
  color(colors.white);
  pdf.setFontSize(17);
  pdf.text("TOKIN Transport", margin + 24, 16);
  pdf.setFontSize(9);
  pdf.text("Assignment confirmation", margin + 24, 22);

  y = 45;
  color(colors.ink);
  pdf.setFontSize(18);
  pdf.text(text(assignment.requestNo), margin, y);
  fill(colors.paleGreen);
  pdf.roundedRect(width - margin - 31, y - 7, 31, 9, 4, 4, "F");
  color(colors.green);
  pdf.setFontSize(8);
  pdf.text("ASSIGNED", width - margin - 22.5, y - 1);

  y += 12;
  fill(colors.paleBlue);
  pdf.roundedRect(margin, y, contentWidth, 27, 3, 3, "F");
  label("Using date", margin + 6, y + 8);
  value(assignment.usingDate, margin + 6, y + 16, 45);
  label("Pickup time", margin + 64, y + 8);
  value(
    `${assignment.startTime} - ${assignment.endTime}`,
    margin + 64,
    y + 16,
    45,
  );
  label("Passengers", margin + 126, y + 8);
  value(assignment.numPassengers, margin + 126, y + 16, 35);

  y += 38;
  sectionTitle("Route and purpose", y);
  y += 12;
  label("Pickup location", margin, y);
  const pickupHeight = value(assignment.pickupLocation, margin, y + 7, 76);
  label("Destination", margin + 94, y);
  const destinationHeight = value(
    assignment.destination,
    margin + 94,
    y + 7,
    84,
  );
  y += Math.max(pickupHeight, destinationHeight) + 10;
  label("Purpose", margin, y);
  y += value(assignment.purpose, margin, y + 7, contentWidth) + 10;

  sectionTitle("Vehicle and driver", y);
  y += 12;
  fill(colors.white);
  stroke(colors.line);
  pdf.roundedRect(margin, y, contentWidth, 42, 3, 3, "FD");
  label("Vehicle", margin + 6, y + 9);
  value(
    `${assignment.vehicle.licensePlate} - ${assignment.vehicle.brand} ${assignment.vehicle.model}`,
    margin + 6,
    y + 17,
    78,
  );
  label("Driver", margin + 98, y + 9);
  value(assignment.driver.name, margin + 98, y + 17, 73);
  label("Vehicle color", margin + 6, y + 29);
  value(assignment.vehicle.color, margin + 6, y + 37, 78);
  label("Driver phone", margin + 98, y + 29);
  value(assignment.driver.phone, margin + 98, y + 37, 73);
  y += 52;

  sectionTitle("Requester information", y);
  y += 12;
  label("Requester", margin, y);
  value(assignment.requester.name, margin, y + 7, 78);
  label("Department", margin + 94, y);
  value(assignment.requester.department, margin + 94, y + 7, 84);
  y += 19;
  label("Email", margin, y);
  value(assignment.requester.email, margin, y + 7, 78);
  label("Employee ID", margin + 94, y);
  value(assignment.requester.employeeId, margin + 94, y + 7, 84);
  y += 22;

  if (assignment.notes) {
    fill([249, 250, 252]);
    stroke(colors.line);
    const allNoteLines = pdf.splitTextToSize(
      assignment.notes,
      contentWidth - 12,
    );
    const noteLines = allNoteLines.slice(0, 3);
    if (allNoteLines.length > 3)
      noteLines[2] = `${noteLines[2].replace(/\s+$/, "")}...`;
    const noteHeight = Math.max(22, 13 + noteLines.length * 4);
    pdf.roundedRect(margin, y, contentWidth, noteHeight, 3, 3, "FD");
    label("Assignment notes", margin + 6, y + 8);
    color(colors.ink);
    pdf.setFontSize(8.5);
    pdf.text(noteLines, margin + 6, y + 15);
  }

  stroke(colors.line);
  pdf.line(margin, 282, width - margin, 282);
  color(colors.muted);
  pdf.setFontSize(7.5);
  pdf.text(
    "Generated by TOKIN Transport. Please present this document when requested.",
    margin,
    288,
  );
  pdf.text(
    `Assigned: ${text(assignment.assignedAt).slice(0, 19).replace("T", " ")}`,
    width - margin,
    288,
    { align: "right" },
  );

  return new Uint8Array(pdf.output("arraybuffer"));
}
