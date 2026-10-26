"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { destinationStops } from "@/lib/route-stops";

const MAX_STOPS = 6;

export function MultiStopDestinationField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [fields, setFields] = useState(() => {
    const stops = destinationStops(value);
    return stops.length ? stops : [""];
  });

  useEffect(() => {
    const next = destinationStops(value);
    const savedCurrent = fields.map((stop) => stop.trim()).filter(Boolean).join(" → ");
    const savedNext = next.join(" → ");
    if (savedCurrent !== savedNext) setFields(next.length ? next : [""]);
  }, [value, fields]);

  const update = (index: number, nextValue: string) => {
    const next = [...fields];
    next[index] = nextValue;
    setFields(next);
    onChange(next.map((stop) => stop.trim()).filter(Boolean).join(" → "));
  };

  const remove = (index: number) => {
    const next = fields.filter((_, itemIndex) => itemIndex !== index);
    setFields(next.length ? next : [""]);
    onChange(next.map((stop) => stop.trim()).filter(Boolean).join(" → "));
  };

  return (
    <Field label="Destination stops">
      <div className="space-y-3">
        <div className="relative space-y-2.5">
          {fields.map((stop, index) => {
            const isFirst = index === 0;
            const isLast = index === fields.length - 1 && fields.length > 1;
            const isIntermediate = !isFirst && !isLast;

            return (
              <div className="flex items-center gap-2.5" key={index}>
                {/* Step sequence badge */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">
                  {index + 1}
                </div>

                <div className="relative flex-1">
                  <Input
                    id={index === 0 ? "destination" : `destination-stop-${index + 1}`}
                    required={index === 0}
                    disabled={disabled}
                    placeholder={
                      isFirst
                        ? fields.length > 1
                          ? "First stop location"
                          : "Final destination or main stop"
                        : isLast
                          ? "Final destination stop"
                          : `Intermediate stop ${index + 1}`
                    }
                    value={stop}
                    onChange={(event) => update(index, event.target.value)}
                  />
                </div>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    aria-label={`Remove stop ${index + 1}`}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-danger hover:bg-danger-light/50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Route Chain Preview when multiple stops exist */}
        {fields.filter((s) => s.trim()).length > 1 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Trip Itinerary Preview
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink font-medium">
              <span className="rounded bg-white px-2 py-0.5 border border-slate-200 text-slate-600">
                Origin
              </span>
              {fields
                .filter((s) => s.trim())
                .map((s, idx, arr) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <span className="text-brand font-bold">➔</span>
                    <span
                      className={`rounded px-2 py-0.5 border ${
                        idx === arr.length - 1
                          ? "bg-brand text-white border-brand font-semibold shadow-xs"
                          : "bg-white border-slate-200 text-slate-800"
                      }`}
                    >
                      {s.trim()}
                    </span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {fields.length < MAX_STOPS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !fields[fields.length - 1].trim()}
            onClick={() => setFields((current) => [...current, ""])}
            className="text-xs gap-1.5"
          >
            <Plus size={14} /> Add another stop
          </Button>
        )}

        {fields.filter((s) => s.trim()).length > 1 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">⏱️ Multi-stop Schedule Advisory:</span> Please allow a 15–20 minute buffer per intermediate stop to prevent itinerary delays and ensure on-time return.
          </div>
        ) : (
          <p className="text-xs leading-5 text-slate-500">
            Add stops in travel order. The driver route will open sequentially in Google Maps.
          </p>
        )}
      </div>
    </Field>
  );
}
