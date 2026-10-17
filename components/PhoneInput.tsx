"use client";
import { useEffect, useState } from "react";
import { COUNTRIES, fromE164, guessCountry, toE164 } from "@/lib/phone";

const box = "h-[52px] rounded-[14px] border-[1.5px] border-field bg-surface text-[17px] focus:border-primary focus:outline-none";

/**
 * Country picker + local number. Calls onChange with the E.164 number ("" when empty), so nobody
 * has to type "+66" or drop their leading 0 themselves.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  testId,
}: {
  id: string;
  value: string | null;
  onChange: (e164: string) => void;
  testId?: string;
}) {
  const [initial] = useState(() => fromE164(value, guessCountry()));
  const [code, setCode] = useState(initial.country.code);
  const [local, setLocal] = useState(initial.local);

  // Time zone is only known in the browser: pick the likely country once, if no number was saved.
  useEffect(() => {
    if (!value) setCode(guessCountry(Intl.DateTimeFormat().resolvedOptions().timeZone).code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const country = COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]!;
  function update(nextCode: string, nextLocal: string) {
    setCode(nextCode);
    setLocal(nextLocal);
    const c = COUNTRIES.find((x) => x.code === nextCode) ?? COUNTRIES[0]!;
    onChange(toE164(c, nextLocal));
  }

  return (
    <div className="flex gap-2">
      <label htmlFor={`${id}-country`} className="sr-only">
        Country
      </label>
      <select
        id={`${id}-country`}
        value={code}
        onChange={(e) => update(e.target.value, local)}
        className={`${box} w-[104px] shrink-0 px-2.5`}
        data-testid={testId ? `${testId}-country` : undefined}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} +{c.dial}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={country.code === "TH" ? "081 234 5678" : country.code === "AU" ? "0412 345 678" : "Mobile number"}
        value={local}
        onChange={(e) => update(code, e.target.value)}
        className={`${box} min-w-0 flex-1 px-4`}
        data-testid={testId}
      />
    </div>
  );
}
