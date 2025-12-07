import { useState } from 'react';

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export default function Switch({ checked = false, onChange }: SwitchProps) {
  const [isChecked, setIsChecked] = useState(checked);

  const toggle = () => {
    setIsChecked(!isChecked);
    onChange?.(!isChecked);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${isChecked ? 'bg-yellow-600' : 'bg-gray-300'
        }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${isChecked ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );
}
