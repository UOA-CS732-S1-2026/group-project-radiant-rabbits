type InputProps = {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
};

export default function Input({
  id,
  label,
  placeholder = "",
  type = "text",
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
        className="rounded-xl border border-brand-accent bg-brand-surface px-md py-md text-body-sm text-brand-dark outline-none focus:ring-2 focus:ring-brand-primary"
      />
    </div>
  );
}
