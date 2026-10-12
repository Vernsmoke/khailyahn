"use client";
import { useEffect } from "react";

export function FormFeedback() {
  useEffect(() => {
    let pending = false;
    let sequence = 0;
    const errors = new Map<HTMLInputElement, HTMLElement>();
    function invalid(event: Event) {
      event.preventDefault();
      const field = event.target as HTMLInputElement;
      field.setAttribute("aria-invalid", "true");
      let feedback = errors.get(field);
      if (!feedback) {
        feedback = document.createElement("span");
        feedback.id = `field-error-${++sequence}`;
        feedback.className = "field-error";
        feedback.setAttribute("role", "alert");
        const anchor = field.closest(".custom-date") || field;
        anchor.insertAdjacentElement("afterend", feedback);
        errors.set(field, feedback);
      }
      field.setAttribute("aria-errormessage", feedback.id);
      feedback.textContent = field.validationMessage;
      if (pending) return;
      pending = true;
      field.focus();
      setTimeout(() => {
        pending = false;
      }, 0);
    }
    function clear(event: Event) {
      const field = event.target as HTMLInputElement;
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-errormessage");
      errors.get(field)?.remove();
      errors.delete(field);
    }
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", clear);
    document.addEventListener("change", clear);
    return () => {
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", clear);
      document.removeEventListener("change", clear);
      errors.forEach((feedback, field) => {
        feedback.remove();
        field.removeAttribute("aria-invalid");
        field.removeAttribute("aria-errormessage");
      });
    };
  }, []);
  return null;
}
