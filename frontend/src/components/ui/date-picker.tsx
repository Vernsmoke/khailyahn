"use client";
import { useId, useRef, useState, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { CalendarBlank } from "@phosphor-icons/react";
import { CalendarChoice } from "@/components/ui/calendar-choice";
import { today } from "@/lib/dates";

const months = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2020, index, 1)),
  ),
);

const years = Array.from({ length: 201 }, (_, index) => String(1900 + index));

export function DatePicker(props: InputHTMLAttributes<HTMLInputElement>) {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [monthText, setMonthText] = useState("");
  const [yearText, setYearText] = useState("");
  const [dayText, setDayText] = useState("");
  const [error, setError] = useState("");
  const errorId = useId();
  const [year, number] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
  function choose(value: string) {
    if (props.disabled || props.readOnly) return;
    const field = input.current!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    dialog.current?.close();
    setOpen(false);
    field.focus();
  }
  function shift(amount: number) {
    const date = new Date(Date.UTC(year, number - 1 + amount, 1));
    if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) return;
    setMonth(date.toISOString().slice(0, 7));
    setMonthText(months[date.getUTCMonth()]);
    setYearText(String(date.getUTCFullYear()));
    setError("");
  }
  function selectMonth(name: string) {
    setMonthText(name);
    setMonth(`${year}-${String(months.indexOf(name) + 1).padStart(2, "0")}`);
    setError("");
  }
  function applyTypedDate() {
    const matchingMonths = months.filter((name) =>
      name.toLowerCase().startsWith(monthText.trim().toLowerCase()),
    );
    const typedYear = Number(yearText);
    const typedDay = Number(dayText);
    if (matchingMonths.length !== 1) {
      setError("Choose a month. For M, select March or May.");
      return;
    }
    const typedMonth = months.indexOf(matchingMonths[0]) + 1;
    if (!/^\d{4}$/.test(yearText) || typedYear < 1900 || typedYear > 2100) {
      setError("Enter a year from 1900 to 2100.");
      return;
    }
    if (
      !/^\d{1,2}$/.test(dayText) ||
      typedDay < 1 ||
      typedDay > new Date(Date.UTC(typedYear, typedMonth, 0)).getUTCDate()
    ) {
      setError("Enter a valid day for this month and year.");
      return;
    }
    const value = `${typedYear}-${String(typedMonth).padStart(2, "0")}-${String(typedDay).padStart(2, "0")}`;
    if (
      (props.min && value < String(props.min)) ||
      (props.max && value > String(props.max))
    ) {
      setError(
        `Choose a date${props.min ? ` on or after ${props.min}` : ""}${props.max ? ` on or before ${props.max}` : ""}.`,
      );
      return;
    }
    choose(value);
  }
  return (
    <span className="custom-date">
      <input {...props} ref={input} type="date" />
      <button
        type="button"
        className="calendar-trigger"
        aria-label={`Open calendar${props.name ? ` for ${props.name.replaceAll("_", " ")}` : ""}`}
        aria-haspopup="dialog"
        disabled={props.disabled || props.readOnly}
        onClick={() => {
          const date = input.current?.value || today();
          setMonth(date.slice(0, 7));
          setMonthText(months[Number(date.slice(5, 7)) - 1]);
          setYearText(date.slice(0, 4));
          setDayText(input.current?.value ? date.slice(8, 10) : "");
          setError("");
          setSelected(input.current?.value || "");
          setOpen(true);
        }}
      >
        {" "}
        <CalendarBlank size={20} />{" "}
      </button>
      {open &&
        createPortal(
          <dialog
            className="calendar-dialog"
            ref={(node) => {
              dialog.current = node;
              if (node && !node.open) node.showModal();
            }}
            onClose={() => {
              setOpen(false);
              input.current?.focus();
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                dialog.current?.close();
                setOpen(false);
              }
            }}
            aria-label="Choose date"
          >
            <div className="calendar-heading">
              <strong>Choose date</strong>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Close calendar"
              >
                ×
              </button>
            </div>
            <p className="calendar-hint">
              Type a date below or choose a day on the calendar.
            </p>
            <div className="calendar-controls calendar-entry">
              <button
                type="button"
                onClick={() => shift(-1)}
                aria-label="Previous month"
                disabled={year === 1900 && number === 1}
              >
                ‹
              </button>
              <CalendarChoice
                label="Month"
                value={monthText}
                options={months}
                onChange={(text) => {
                  setMonthText(text);
                  setError("");
                  const exact = months.findIndex(
                    (name) => name.toLowerCase() === text.trim().toLowerCase(),
                  );
                  if (exact >= 0)
                    setMonth(`${year}-${String(exact + 1).padStart(2, "0")}`);
                }}
                onSelect={selectMonth}
                onApply={applyTypedDate}
              />
              <CalendarChoice
                label="Year"
                value={yearText}
                options={years}
                numeric
                onChange={(text) => {
                  setYearText(text);
                  setError("");
                  const value = Number(text);
                  if (/^\d{4}$/.test(text) && value >= 1900 && value <= 2100)
                    setMonth(`${value}-${String(number).padStart(2, "0")}`);
                }}
                onSelect={(text) => {
                  setYearText(text);
                  setMonth(`${text}-${String(number).padStart(2, "0")}`);
                  setError("");
                }}
                onApply={applyTypedDate}
              />
              <button
                type="button"
                onClick={() => shift(1)}
                aria-label="Next month"
                disabled={year === 2100 && number === 12}
              >
                ›
              </button>
            </div>
            <div className="calendar-typed-day">
              <label>
                Day
                <input
                  aria-label="Calendar day"
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="DD"
                  value={dayText}
                  onChange={(event) => {
                    setDayText(event.target.value);
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyTypedDate();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="button primary"
                onClick={applyTypedDate}
                aria-describedby={error ? errorId : undefined}
              >
                Use date
              </button>
            </div>
            {error && (
              <p id={errorId} className="calendar-error" role="alert">
                {error}
              </p>
            )}
            <p className="calendar-month-caption" aria-live="polite">
              {months[number - 1]} {year}
            </p>
            <div className="calendar-days">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <span key={day}>{day}</span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <button
                    type="button"
                    key={date}
                    disabled={Boolean(
                      (props.min && date < String(props.min)) ||
                      (props.max && date > String(props.max)),
                    )}
                    aria-label={date}
                    aria-pressed={selected === date}
                    className={date === today() ? "calendar-today" : ""}
                    onClick={() => choose(date)}
                  >
                    {i + 1}
                  </button>
                );
              })}
              {Array.from({ length: 42 - offset - days }, (_, index) => (
                <span key={`trailing-${index}`} aria-hidden="true" />
              ))}
            </div>
            {!props.required && (
              <button
                type="button"
                className="button"
                onClick={() => choose("")}
              >
                Clear date
              </button>
            )}
          </dialog>,
          document.body,
        )}
    </span>
  );
}
