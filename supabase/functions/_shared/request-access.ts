const requiredText = (value: unknown, label: string, max = 500) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) throw new Error(`${label} is invalid.`);
  return text;
};

const email = (value: unknown, label: string) => {
  const text = requiredText(value, label, 240).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error(`${label} is invalid.`);
  return text;
};

const date = (value: unknown) => {
  const text = requiredText(value, 'Using date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Using date is invalid.');
  return text;
};

const time = (value: unknown, label: string) => {
  const text = requiredText(value, label, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) throw new Error(`${label} is invalid.`);
  return text;
};

const token = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^[A-Za-z0-9_-]{32,512}$/.test(text)) throw new Error('The request link is invalid.');
  return text;
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const bangkokMinutes = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
};

export { bangkokMinutes, date, email, randomToken, requiredText, sha256Hex, time, token };
