import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variation?: 'primary' | 'secondary' | 'outlined';
  className?: string;
};

export default function Button({
  variation = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  let baseButtonStyle = 'py-2 px-4 rounded-md cursor-pointer ';

  switch (variation) {
    case 'primary':
      baseButtonStyle += 'bg-yellow-500/80 text-white ';
      break;
    case 'secondary':
      baseButtonStyle += 'bg-gray-500 ';
      break;
    case 'outlined':
      baseButtonStyle += 'border border-white/30 text-white ';
      break;
  }

  return (
    <button className={`${baseButtonStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}
