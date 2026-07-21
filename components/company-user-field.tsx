'use client';

import { useEffect, useRef, useState } from 'react';
import { Field, Input } from './ui';
import { Loader2 } from 'lucide-react';

export type CompanyUser = {
  displayName: string;
  mail: string;
  department: string;
  jobTitle: string;
  employeeId?: string;
};

export function CompanyUserField({
  label,
  value,
  onChange,
  onSelectUser,
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelectUser: (user: CompanyUser) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [results, setResults] = useState<CompanyUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || value.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey) return;
      setSearching(true);
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/search-company-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: publishableKey },
          body: JSON.stringify({ query: value.trim() }),
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result.users)) {
          setResults(result.users);
          setShowDropdown(result.users.length > 0);
        } else {
          setResults([]);
          setShowDropdown(false);
        }
      } catch {
        setResults([]);
        setShowDropdown(false);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value, disabled]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Field label={label}>
        <div className="relative">
          <Input
            required={required}
            disabled={disabled}
            value={value}
            placeholder={placeholder}
            onChange={(e) => {
              onChange(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (results.length > 0) setShowDropdown(true);
            }}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-brand" />
          )}
        </div>
      </Field>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-line bg-white shadow-modal animate-fade-in">
          {results.map((person) => (
            <button
              type="button"
              key={person.mail}
              onClick={() => {
                onSelectUser(person);
                setShowDropdown(false);
                setResults([]);
              }}
              className="block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-brand-light transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink truncate">{person.displayName}</span>
                {person.department && (
                  <span className="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                    {person.department}
                  </span>
                )}
              </div>
              <span className="mt-0.5 block text-xs text-gray-500 truncate">
                {person.mail} {person.jobTitle ? `• ${person.jobTitle}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
