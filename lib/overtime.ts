export function timeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function overtimeDuration(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;
  const total = endMinutes - startMinutes;
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}