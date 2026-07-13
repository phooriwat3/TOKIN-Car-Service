import React from 'react';
import { cn } from '@/lib/utils';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>(
  ({ className, variant = 'primary', ...p }, ref) => {
    return <button ref={ref} className={cn('inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', variant === 'primary' && 'bg-brand text-white hover:bg-[#194786]', variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-gray-50', variant === 'danger' && 'bg-red-600 text-white', variant === 'ghost' && 'text-gray-600 hover:bg-gray-100', className)} {...p} />;
  }
);
Button.displayName = 'Button';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...p }, ref) => {
    return <div ref={ref} className={cn('rounded-lg border border-line bg-white shadow-panel', className)} {...p} />;
  }
);
Card.displayName = 'Card';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => {
    return <input ref={ref} className={cn('h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100', className)} {...p} />;
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => {
    return <select ref={ref} className={cn('h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand', className)} {...p} />;
  }
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => {
    return <textarea ref={ref} className={cn('min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand', className)} {...p} />;
  }
);
Textarea.displayName = 'Textarea';
export function Field({label,error,children}:{label:string;error?:string;children:React.ReactNode}){return <label className="block space-y-1.5 text-sm font-medium text-gray-700"><span>{label}</span>{children}{error&&<span className="block text-xs text-red-600">{error}</span>}</label>}
export function Badge({children,status}:{children:React.ReactNode;status?:string}){const c=status==='completed'?'bg-green-100 text-green-800':status==='rejected'||status==='cancelled'?'bg-red-100 text-red-800':status==='pending_approval'?'bg-amber-100 text-amber-800':status==='approved'?'bg-blue-100 text-blue-800':status==='assigned'?'bg-violet-100 text-violet-800':status==='in_progress'?'bg-indigo-100 text-indigo-800':'bg-gray-100 text-gray-700';return <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-semibold',c)}>{children}</span>}
export function Empty({title,body}:{title:string;body:string}){return <div className="py-14 text-center"><p className="font-semibold text-ink">{title}</p><p className="mt-1 text-sm text-gray-500">{body}</p></div>}
