import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Converts YYYY-MM-DD (ISO) -> DD/MM/YYYY for display
function isoToIt(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Parses DD/MM/YYYY (accepts also - or .) -> YYYY-MM-DD or "" if invalid/empty
function itToIso(v: string): string {
  const s = v.trim();
  if (!s) return "";
  const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s);
  if (!m) return "";
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (y < 100) y += y >= 30 ? 1900 : 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return "";
  return `${y.toString().padStart(4, "0")}-${mo.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function autoFormat(v: string): string {
  // Digits only, then insert / after 2 and 4 chars
  const digits = v.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

interface ItalianDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** ISO date string YYYY-MM-DD (or empty) */
  value: string | null | undefined;
  /** Emits ISO date string YYYY-MM-DD or "" when invalid/cleared */
  onChange: (iso: string) => void;
  /** Called on blur with the ISO value */
  onBlurIso?: (iso: string) => void;
}

export const ItalianDateInput = React.forwardRef<HTMLInputElement, ItalianDateInputProps>(
  ({ value, onChange, onBlurIso, className, placeholder = "GG/MM/AAAA", ...rest }, ref) => {
    const [text, setText] = React.useState<string>(() => isoToIt(value));

    React.useEffect(() => {
      setText(isoToIt(value));
    }, [value]);

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        placeholder={placeholder}
        className={cn("tabular-nums", className)}
        value={text}
        onChange={(e) => {
          const formatted = autoFormat(e.target.value);
          setText(formatted);
          const iso = itToIso(formatted);
          // Emit iso only when valid or empty; keep parent in sync
          if (iso || formatted === "") onChange(iso);
        }}
        onBlur={() => {
          const iso = itToIso(text);
          if (!iso && text !== "") {
            // Invalid entry: reset to last valid value
            setText(isoToIt(value));
          } else {
            setText(isoToIt(iso));
          }
          onBlurIso?.(iso);
        }}
        maxLength={10}
        {...rest}
      />
    );
  }
);
ItalianDateInput.displayName = "ItalianDateInput";
