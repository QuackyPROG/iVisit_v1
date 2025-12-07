import React from "react";

type CheckboxBaseProps = {
  label?: string;
  containerClassName?: string;
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
};

type NativeCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type"
>;

export type CheckboxProps = CheckboxBaseProps & NativeCheckboxProps;

export default function Checkbox({
  id,
  checked,
  defaultChecked,
  disabled,
  label,
  className = "",
  containerClassName = "",
  onChange,
  ...rest
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${containerClassName}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked, e)}
        className={`w-4 h-4 rounded border-gray-300 ${className}`}
        {...rest}
      />
      {label && <span className="select-none">{label}</span>}
    </label>
  );
}
