export function destinationStops(value: string) {
  return value
    .split(/\s*(?:→|->|\n)\s*/)
    .map((stop) => stop.trim())
    .filter(Boolean);
}
