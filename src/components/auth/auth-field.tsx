"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete: string;
  autoFocus?: boolean;
  value: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  minLength?: number;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  autoFocus,
  value,
  error,
  hint,
  disabled,
  minLength,
  onChange,
  onBlur,
}: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [hintId, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        disabled={disabled}
        minLength={minLength}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="border-zinc-700 bg-zinc-950"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
