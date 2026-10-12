"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

export function CalendarChoice({
  label,
  value,
  options,
  onChange,
  onSelect,
  onApply,
  numeric = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  onApply: () => void;
  numeric?: boolean;
}) {
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [active, setActive] = useState(0);
  const matches = filtering
    ? options.filter((option) =>
        option.toLowerCase().startsWith(value.trim().toLowerCase()),
      )
    : options;
  useEffect(() => {
    if (open)
      list.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active, value]);
  function showAll() {
    setFiltering(false);
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  }
  function select(option: string) {
    onSelect(option);
    setOpen(false);
  }
  return (
    <div
      className="calendar-choice"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="calendar-choice-field">
        <input
          id={id}
          ref={field}
          aria-label={`Calendar ${label.toLowerCase()}`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && matches[active] ? `${id}-option-${active}` : undefined
          }
          autoComplete="off"
          inputMode={numeric ? "numeric" : "text"}
          maxLength={numeric ? 4 : undefined}
          value={value}
          onFocus={(event) => {
            event.target.select();
            showAll();
          }}
          onClick={() => {
            if (!open) showAll();
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setFiltering(true);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) showAll();
              else
                setActive((current) =>
                  Math.max(
                    0,
                    Math.min(
                      matches.length - 1,
                      current + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  ),
                );
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && matches[active]) select(matches[active]);
              else onApply();
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            } else if (event.key === "Tab") {
              if (filtering && matches.length === 1) select(matches[0]);
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="calendar-choice-toggle"
          aria-label={`Show ${label.toLowerCase()} choices`}
          aria-expanded={open}
          aria-controls={`${id}-options`}
          tabIndex={-1}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else {
              field.current?.focus();
              showAll();
            }
          }}
        >
          <CaretDown size={14} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div
          ref={list}
          id={`${id}-options`}
          className="calendar-choice-options"
          role="listbox"
          aria-label={`${label} choices`}
        >
          {matches.length ? (
            matches.map((option, index) => (
              <div
                key={option}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === active}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => select(option)}
              >
                {option}
              </div>
            ))
          ) : (
            <div className="calendar-no-options">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
