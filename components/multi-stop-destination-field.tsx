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
      <div className="space-y-2">
        {fields.map((stop, index) => (
          <div className="flex gap-2" key={`${index}-${stop}`}>
            <Input
              id={index === 0 ? "destination" : `destination-stop-${index + 1}`}
              required={index === 0}
              disabled={disabled}
              placeholder={index === 0 ? "Final destination or first stop" : `Stop ${index + 1}`}
              value={stop}
              onChange={(event) => update(index, event.target.value)}
            />
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-label={`Remove stop ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
        {fields.length < MAX_STOPS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !fields[fields.length - 1].trim()}
            onClick={() => setFields((current) => [...current, ""])}
          >
            <Plus size={15} /> Add stop
          </Button>
        )}
        <p className="text-xs leading-5 text-slate-500">
          Add stops in travel order. The route will open in Google Maps as Pickup → Stop 1 → Final stop.
        </p>
      </div>
    </Field>
  );
}
