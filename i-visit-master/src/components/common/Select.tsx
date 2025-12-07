import { useState, useRef, useEffect } from "react";

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  id: string;
  options: Option[];
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export default function Select({
  id,
  options,
  placeholder = "Select...",
  className = "",
  value,
  onChange,
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: Option) => {
    if (disabled) return;
    setSelected(option);
    setIsOpen(false);
    if (onChange) onChange(option.value);
  };

  // Keep internal selected state in sync when parent controls value prop
  useEffect(() => {
    if (typeof value === "undefined") return;
    const match = options.find((o) => o.value === value) ?? null;
    setSelected(match);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOpen = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      id={id}
      ref={dropdownRef}
      className={`relative text-dark-gray ${className}`}
    >
      <div
        onClick={handleToggleOpen}
        className={`px-4 py-2 bg-white/80 text-gray-800 rounded-md border border-gray-300 flex justify-between items-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {isOpen && !disabled && (
        <ul
          className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 custom-scrollbar overflow-auto"
          role="listbox"
          aria-labelledby={id}
        >
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => handleSelect(option)}
              className={`px-4 py-2 cursor-pointer hover:bg-yellow-600 hover:text-white ${selected?.value === option.value ? "bg-yellow-300" : ""
                }`}
              role="option"
              aria-selected={selected?.value === option.value}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
