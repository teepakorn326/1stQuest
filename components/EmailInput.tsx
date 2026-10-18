"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Field";
import { emailProblem } from "@/lib/validate";

/** Email field that says what's wrong when you leave it (or when the form passes an error). */
export function EmailInput({
  id,
  value,
  onChange,
  error,
  placeholder = "name@example.com",
  autoFocus,
  autoComplete = "email",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [touched, setTouched] = useState(false);
  const shown = error ?? (touched && value ? emailProblem(value) : null);
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        id={id}
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        required
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={shown ? true : undefined}
        aria-describedby={shown ? `${id}-error` : undefined}
        className={shown ? "border-warm-ink" : undefined}
      />
      {shown && (
        <p id={`${id}-error`} className="m-0 text-sm text-warm-ink" role="alert">
          {shown}
        </p>
      )}
    </div>
  );
}
