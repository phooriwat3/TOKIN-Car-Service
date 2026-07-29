"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { useApp } from "./app-provider";
import { Button, Card, Field, Input } from "./ui";

const emptyForm = {
  employeeId: "",
  fullName: "",
  phone: "",
  licenseNumber: "",
  licenseExpiry: "",
};

export function DriverManagement() {
  const { data, saveDriver } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const save = async () => {
    setMessage("");
    try {
      await saveDriver({ id: "d-" + Date.now(), ...form, active: true });
      setForm(emptyForm);
      setOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save driver.",
      );
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Driver directory</h1>
          <p className="text-sm text-gray-500">
            Add and maintain driver information for vehicle assignments.
          </p>
        </div>
        <Button onClick={() => setOpen((current) => !current)}>
          <Plus size={16} />
          Add driver
        </Button>
      </div>

      {open && (
        <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-5">
          {Object.entries(form).map(([key, value]) => (
            <Field key={key} label={key.replace(/([A-Z])/g, " $1")}>
              <Input
                type={key === "licenseExpiry" ? "date" : "text"}
                value={value}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </Field>
          ))}
          <Button
            className="sm:col-span-5"
            disabled={Object.values(form).some((value) => !value)}
            onClick={save}
          >
            Save driver
          </Button>
        </Card>
      )}

      {message && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data.drivers.map((driver) => {
          const licenseExpiresSoon =
            (new Date(driver.licenseExpiry).getTime() - Date.now()) / 86400000 <
            30;
          return (
            <Card className="p-4" key={driver.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold">{driver.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {driver.employeeId} · {driver.phone}
                  </p>
                </div>
                {licenseExpiresSoon && (
                  <AlertTriangle className="shrink-0 text-amber-600" />
                )}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                License {driver.licenseNumber} · expires {driver.licenseExpiry}
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
