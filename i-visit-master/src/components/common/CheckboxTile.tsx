import Checkbox from "./Checkbox";

export interface CheckboxTileProps {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  className?: string;
  disabled?: boolean;
  showCheckbox?: boolean;
}

export default function CheckboxTile({
  id,
  label,
  checked,
  onChange,
  description,
  className,
  disabled = false,
  showCheckbox = true,
}: CheckboxTileProps) {
  const baseStyles =
    "flex items-center justify-between rounded p-3 transition-colors duration-150 cursor-pointer select-none";

  const selectedStyles = checked
    ? "border border-yellow-500 bg-white/5"
    : "border border-white/30";

  const disabledStyles = disabled
    ? "opacity-50 cursor-not-allowed"
    : "";

  return (
    <div
      className={`${baseStyles} ${selectedStyles} ${disabledStyles} ${className || ""}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      {/* LEFT SIDE */}
      <div className="flex items-center gap-3">
        {showCheckbox && (
          <Checkbox
            id={id}
            checked={checked}
            disabled={disabled}
            onChange={(v) => !disabled && onChange(v)}
          />
        )}

        <div className="flex flex-col">
          <span className="font-medium">{label}</span>
          {description && (
            <span className="text-xs text-white/50">{description}</span>
          )}
        </div>
      </div>
    </div>
  );
}
