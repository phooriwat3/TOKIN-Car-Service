'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Field, Input } from './ui';
import { Loader2 } from 'lucide-react';
import { compareCompanyUsersBySearch } from '@/lib/company-search';
import { createClient } from '@/lib/supabase/client';

export type CompanyUser = {
  displayName: string;
  mail: string;
  department: string;
  jobTitle: string;
  employeeId?: string;
};

export function CompanyUserField({
  label,
  inputId,
  describedBy,
  value,
  onChange,
  onSelectUser,
  placeholder,
  required = false,
  disabled = false,
}: {
  label: React.ReactNode;
  inputId?: string;
  describedBy?: string;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedUserNameRef = useRef<string | null>(null);
  const searchCacheRef = useRef(new Map<string, CompanyUser[]>());
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (showDropdown && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };
    if (showDropdown) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown || disabled || value.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    // Skip searching if the value exactly matches the name we just selected
    if (selectedUserNameRef.current === value.trim()) {
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      const cacheKey = value.trim().toLowerCase();
      const cached = searchCacheRef.current.get(cacheKey);
      if (cached) {
        setResults(cached);
        setShowDropdown(cached.length > 0);
        return;
      }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey) return;
      const supabase = createClient();
      const { data: { session } } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      setSearching(true);
      try {
        const endpoint = session?.access_token
          ? "search-company-users"
          : "public-search-employee-directory";
        const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: publishableKey,
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ query: value.trim() }),
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result.users)) {
          const queryStr = value.trim().toLowerCase();
          const sorted = [...result.users].sort((a, b) =>
            compareCompanyUsersBySearch(a, b, queryStr),
          );
          searchCacheRef.current.set(cacheKey, sorted);
          setResults(sorted);
          setShowDropdown(sorted.length > 0);
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
    }, 120);

    return () => {
      window.clearTimeout(timer);
      setSearching(false);
    };
  }, [value, disabled, showDropdown]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const inputContent = (
    <div className="relative">
      <Input
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown && results.length > 0}
        aria-controls={inputId ? `${inputId}-results` : undefined}
        aria-describedby={describedBy}
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          selectedUserNameRef.current = null; // Clear lock when user types
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          selectedUserNameRef.current = null; // Clear lock when user focuses to search again
          if (value.trim().length >= 3) {
            setShowDropdown(true);
          }
        }}
        onBlur={() => {
          // A brief delay to allow onClick of dropdown item to fire before unmounting
          setTimeout(() => {
            setShowDropdown(false);
          }, 200);
        }}
      />
      {searching && (
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {label ? <Field label={label}>{inputContent}</Field> : inputContent}

      {showDropdown && results.length > 0 && coords.width > 0 && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          id={inputId ? `${inputId}-results` : undefined}
          role="listbox"
          aria-label="Company directory results"
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            minWidth: `${coords.width}px`,
          }}
          className="z-[9999] w-max max-h-60 max-w-[calc(100vw-2rem)] sm:max-w-[480px] overflow-y-auto rounded-lg border border-line bg-white shadow-modal animate-fade-in"
        >
          {results.map((person) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={person.mail}
              onClick={() => {
                selectedUserNameRef.current = person.displayName.trim();
                onSelectUser(person);
                setShowDropdown(false);
                setResults([]);
                setSearching(false);
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
        </div>,
        document.body
      )}
    </div>
  );
}
