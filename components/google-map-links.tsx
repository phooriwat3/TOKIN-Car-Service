import { MapPin, Route } from "lucide-react";
import { destinationStops } from "@/lib/route-stops";

function mapsUrl(
  mode: "search" | "directions",
  origin: string,
  destination: string,
) {
  const stops = destinationStops(destination);
  const finalStop = stops.at(-1) ?? destination.trim();
  const params = new URLSearchParams({ api: "1" });
  if (mode === "search") params.set("query", finalStop);
  else {
    if (origin.trim()) params.set("origin", origin.trim());
    params.set("destination", finalStop);
    if (stops.length > 1) params.set("waypoints", stops.slice(0, -1).join("|"));
    params.set("travelmode", "driving");
  }
  return `https://www.google.com/maps/${mode === "search" ? "search" : "dir"}/?${params.toString()}`;
}

export function GoogleMapLinks({
  origin,
  destination,
  compact = false,
}: {
  origin: string;
  destination: string;
  compact?: boolean;
}) {
  if (!destination.trim()) return null;
  const multipleStops = destinationStops(destination).length > 1;
  const base =
    "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition";
  return (
    <div
      className={`flex flex-wrap gap-2 ${compact ? "" : "rounded-lg border border-blue-100 bg-blue-50 p-3"}`}
    >
      <a
        href={mapsUrl("search", origin, destination)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} border border-line bg-white text-ink hover:bg-gray-50`}
      >
        <MapPin size={16} />
        {multipleStops ? "View final stop" : "View destination"}
      </a>
      <a
        href={mapsUrl("directions", origin, destination)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-brand text-white hover:bg-[#194786]`}
      >
        <Route size={16} />
        {multipleStops ? "Open route" : "Get directions"}
      </a>
    </div>
  );
}
