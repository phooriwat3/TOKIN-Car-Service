import { MapPin, Route } from 'lucide-react';

function mapsUrl(mode: 'search' | 'directions', origin: string, destination: string) {
  const params = new URLSearchParams({ api: '1' });
  if (mode === 'search') params.set('query', destination);
  else {
    if (origin.trim()) params.set('origin', origin.trim());
    params.set('destination', destination.trim());
    params.set('travelmode', 'driving');
  }
  return `https://www.google.com/maps/${mode === 'search' ? 'search' : 'dir'}/?${params.toString()}`;
}

export function GoogleMapLinks({ origin, destination, compact = false }: { origin: string; destination: string; compact?: boolean }) {
  if (!destination.trim()) return null;
  const base = 'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition';
  return <div className={`flex flex-wrap gap-2 ${compact ? '' : 'rounded-lg border border-blue-100 bg-blue-50 p-3'}`}>
    <a href={mapsUrl('search', origin, destination)} target="_blank" rel="noopener noreferrer" className={`${base} border border-line bg-white text-ink hover:bg-gray-50`}><MapPin size={16} />View destination</a>
    <a href={mapsUrl('directions', origin, destination)} target="_blank" rel="noopener noreferrer" className={`${base} bg-brand text-white hover:bg-[#194786]`}><Route size={16} />Get directions</a>
  </div>;
}
