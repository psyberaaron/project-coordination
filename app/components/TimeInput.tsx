"use client";

import { useMemo, useState } from "react";
import {
  zonedDateTimeToUtc,
  formatDateTimeInZone,
  tzAbbrev,
  checkAwakeWindow,
} from "@/lib/time";

interface TimeInputProps {
  label?: string;
  value: string | null; // ISO UTC string
  onChange: (isoUtc: string | null) => void;
  viewerTz: string;
  viewerName: string;
  otherName: string;
  otherTz: string;
  otherAwakeStart: string;
  otherAwakeEnd: string;
}

export default function TimeInput({
  label,
  value,
  onChange,
  viewerTz,
  viewerName,
  otherName,
  otherTz,
  otherAwakeStart,
  otherAwakeEnd,
}: TimeInputProps) {
  const [local, setLocal] = useState(() => (value ? toLocalInputValue(value, viewerTz) : ""));

  const utcDate = useMemo(() => (value ? new Date(value) : null), [value]);

  const warning = useMemo(() => {
    if (!utcDate) return null;
    return checkAwakeWindow(utcDate, otherName, otherTz, otherAwakeStart, otherAwakeEnd).warning;
  }, [utcDate, otherName, otherTz, otherAwakeStart, otherAwakeEnd]);

  function handleChange(v: string) {
    setLocal(v);
    if (!v) {
      onChange(null);
      return;
    }
    const utc = zonedDateTimeToUtc(v, viewerTz);
    onChange(utc.toISOString());
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-600">{label}</label>}
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2"
      />
      {utcDate && (
        <div className="text-xs text-slate-500 flex flex-col gap-0.5">
          <span>
            {viewerName}: {formatDateTimeInZone(utcDate, viewerTz)} {tzAbbrev(viewerTz, utcDate)}
          </span>
          <span>
            {otherName}: {formatDateTimeInZone(utcDate, otherTz)} {tzAbbrev(otherTz, utcDate)}
          </span>
        </div>
      )}
      {warning && (
        <p className="text-xs text-amber-600 font-medium">⚠️ {warning}</p>
      )}
    </div>
  );
}

function toLocalInputValue(isoUtc: string, tz: string): string {
  const date = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}
