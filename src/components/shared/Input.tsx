import type React from "react";

type InputProps = {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  readOnly?: boolean;
  className?: string;
};

export default function Input({
  id,
  label,
  placeholder = "",
  type = "text",
  value,
  onChange,
  onKeyDown,
  onPaste,
  min,
  max,
  readOnly = false,
  className = "",
}: InputProps) {
  return (
    <div className="flex flex-col gap-xs">
      <label
        htmlFor={id}
        className="text-body-sm font-semibold text-brand-dark"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        min={min}
        max={max}
        readOnly={readOnly}
        className={`rounded-xl border border-brand-accent bg-brand-surface px-md py-md text-body-sm text-brand-dark outline-none focus:ring-2 focus:ring-brand-primary ${className}`}
      />
    </div>
  );
}
