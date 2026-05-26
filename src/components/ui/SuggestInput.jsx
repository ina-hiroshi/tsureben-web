import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

export default function SuggestInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
  disabled = false,
  maxSuggestions = 8,
}) {
  const listId = useId();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return suggestions.slice(0, maxSuggestions);
    return suggestions
      .filter((item) => String(item).toLowerCase().includes(query))
      .slice(0, maxSuggestions);
  }, [suggestions, query, maxSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pick = (item) => {
    onChange(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pick(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-tsure-primary mb-1">{label}</label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={open && filtered.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        className="w-full border border-tsure-border rounded-xl px-3 py-2.5 min-h-touch bg-white text-tsure-primary placeholder:text-tsure-muted focus:outline-none focus:ring-2 focus:ring-tsure-accent/50 disabled:opacity-50"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-48 overflow-auto bg-white border border-tsure-border rounded-xl shadow-lg py-1"
        >
          {filtered.map((item, index) => (
            <li key={item} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm ${
                  index === activeIndex
                    ? 'bg-tsure-surface-hover text-tsure-primary'
                    : 'text-tsure-primary hover:bg-tsure-surface-hover'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
