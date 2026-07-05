"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Allow a decimal point (for prices/weights). Defaults to integers only. */
  decimal?: boolean;
  /** Show the field as blank instead of "0" when the committed value is 0. */
  hideZero?: boolean;
}

/**
 * Drop-in replacement for `<input type="number">` that fixes the classic
 * controlled-input bug: clearing the field with backspace used to snap
 * straight back to the fallback value (`parseInt(e.target.value) || 1`),
 * so the next keystroke appended to "1" instead of replacing it.
 *
 * This keeps its own text buffer while focused so the field can go empty
 * while typing, and only clamps/defaults back to a valid number on blur.
 */
export default function NumberInput({
  value,
  onChange,
  min,
  max,
  decimal = false,
  hideZero = false,
  className,
  ...props
}: NumberInputProps) {
  const format = (n: number) => (hideZero && n === 0 ? "" : String(n));
  const [text, setText] = useState(() => format(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pattern = decimal ? /^\d*\.?\d*$/ : /^\d*$/;

  const clamp = (n: number) => {
    let result = n;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };

  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        props.onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!pattern.test(raw)) return;
        setText(raw);
        if (raw !== "" && raw !== ".") {
          const parsed = decimal ? parseFloat(raw) : parseInt(raw, 10);
          if (!isNaN(parsed)) onChange(clamp(parsed));
        }
      }}
      onBlur={(e) => {
        focused.current = false;
        const parsed = decimal ? parseFloat(text) : parseInt(text, 10);
        const next = clamp(isNaN(parsed) ? min ?? 0 : parsed);
        setText(format(next));
        onChange(next);
        props.onBlur?.(e);
      }}
      className={className}
      {...props}
    />
  );
}
