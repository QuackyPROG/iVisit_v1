import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  id?: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value?: string;
  tabindex?: number;
  onChange?: (e: any) => void;
};

export default function Input({
  className,
  id,
  type,
  placeholder,
  value,
  tabindex,
  onChange,
  ...props
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      onChange={onChange}
      value={value}
      tabIndex={tabindex}
      placeholder={placeholder}
      {...props}
      className={`bg-gray-300 text-dark-gray block p-2 focus-visible:outline-none border-none rounded ${className}`}
    />
  );
}
