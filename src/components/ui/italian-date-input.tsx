import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// ISO -> local Date (calendar); no timezone shifting
function isoToDate(iso: string | null | undefined): Date | undefined {
  const parsed = itToIso(isoToIt(iso));
  if (!parsed) return undefined;
  const [y, mo, d] = parsed.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return isNaN(date.getTime()) ? undefined : date;
}

// local Date -> ISO (YYYY-MM-DD)
function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y.toString().padStart(4, "0")}-${mo}-${d}`;
}

interface ItalianDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** ISO date string YYYY-MM-DD (or empty) */
  value: string | null | undefined;
  /** Emits ISO date string YYYY-MM-DD or "" when invalid/cleared */
  onChange: (iso: string) => void;
  /** Called on blur with the ISO value */
  onBlurIso?: (iso: string) => void;
  /** Shows the calendar button that opens a month picker (default: true) */
  showCalendar?: boolean;
}

export const ItalianDateInput = React.forwardRef<HTMLInputElement, ItalianDateInputProps>(
  ({ value, onChange, onBlurIso, className, placeholder = "GG/MM/AAAA", onFocus, disabled, showCalendar = true, ...rest }, ref) => {
    const [text, setText] = React.useState<string>(() => isoToIt(value));
    const [isFocused, setIsFocused] = React.useState(false);
    const [calendarOpen, setCalendarOpen] = React.useState(false);

    React.useEffect(() => {
      // Never rewrite the field while the user is typing: a partial year such as
      // "20" parses as 2020, so syncing from `value` mid-entry would turn
      // "15/03/2026" into "15/03/2020" and swallow the last two digits.
      if (!isFocused) setText(isoToIt(value));
    }, [value, isFocused]);

    // What the calendar shows as selected: the typed date if valid, else the saved one.
    const selectedDate = isoToDate(itToIso(text) || value);

    const pickDate = (date: Date | undefined) => {
      if (!date) return;
      const iso = dateToIso(date);
      setText(isoToIt(iso));
      onChange(iso);
      onBlurIso?.(iso);
      setCalendarOpen(false);
    };

    const input = (
      <Input
        ref={ref}
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        className={cn("tabular-nums", showCalendar && "pr-9", className)}
        value={text}
        onChange={(e) => {
          const formatted = autoFormat(e.target.value);
          setText(formatted);
          const iso = itToIso(formatted);
          // Emit iso only when valid or empty; keep parent in sync
          if (iso || formatted === "") onChange(iso);
        }}
        onBlur={() => {
          setIsFocused(false);
          const iso = itToIso(text);
          if (!iso && text !== "") {
            // Invalid entry: reset to last valid value
            setText(isoToIt(value));
          } else {
            setText(isoToIt(iso));
          }
          onBlurIso?.(iso);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        maxLength={10}
        {...rest}
      />
    );

    if (!showCalendar) return input;

    return (
      <div className="relative">
        {input}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Apri il calendario"
              disabled={disabled}
              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={pickDate}
              // Opens on today's month when the field is still empty.
              defaultMonth={selectedDate ?? new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
ItalianDateInput.displayName = "ItalianDateInput";
