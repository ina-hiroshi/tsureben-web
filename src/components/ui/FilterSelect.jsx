import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';
import AppIcon from './AppIcon';

/**
 * ネイティブ select の代わり（モバイルで位置ずれしにくい Headless UI Listbox）
 * @param {{ value: string, label: string }[]} options
 */
export default function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'すべて',
  className = '',
  disabled = false,
}) {
  const selected =
    options.find((opt) => opt.value === value) ||
    options.find((opt) => opt.value === '') || { value: '', label: placeholder };

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={`block space-y-1 ${className}`}>
        {label && (
          <Listbox.Label className="text-sm font-medium text-tsure-primary">{label}</Listbox.Label>
        )}
        <div className="relative">
          <ListboxButton
            disabled={disabled}
            className="group relative w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-touch rounded-xl border border-tsure-border bg-white text-left text-tsure-primary shadow-tsure-chip focus:outline-none focus:ring-2 focus:ring-tsure-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate text-sm">{selected.label}</span>
            <AppIcon
              icon={ChevronDown}
              size="sm"
              className="text-tsure-muted shrink-0 transition-transform group-data-[open]:rotate-180"
            />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            transition
            className="z-[120] mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-xl border border-tsure-border bg-white py-1 shadow-tsure-raised transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 origin-top"
          >
            {options.map((opt) => (
              <ListboxOption
                key={opt.value === '' ? '__all__' : opt.value}
                value={opt.value}
                className="group flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm text-tsure-primary data-[focus]:bg-tsure-surface-hover data-[selected]:font-semibold"
              >
                <span className="truncate">{opt.label}</span>
                <AppIcon
                  icon={Check}
                  size="sm"
                  className="text-tsure-accent shrink-0 opacity-0 group-data-[selected]:opacity-100"
                />
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </div>
    </Listbox>
  );
}
