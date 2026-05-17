import { forwardRef, useEffect, useState } from "react";
import type { SuggestionHit } from "@acuris-geo/av-sdk";
import { useAcurisSuggest } from "./useAcurisSuggest.js";
import type { AcurisAddressInputProps } from "./types.js";

/**
 * Default styles for the suggestions dropdown. Injected once per page on
 * mount so the component is visible out-of-the-box in environments with
 * CSS resets (Tailwind preflight, modern.css, vanilla Next.js).
 *
 * All selectors use :where(...) so they have zero specificity — any
 * consumer CSS (via suggestionsClassName, a custom renderSuggestion, or
 * a sitewide stylesheet) wins without needing !important.
 *
 * To opt out entirely, set data-acuris-default-styles="off" on the root
 * <html> element before the component mounts (e.g. in your <head>).
 */
const DEFAULT_STYLES_ID = "acuris-centra-checkout-default-styles";
const DEFAULT_STYLES = `
:where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions]) {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
}
:where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li) {
  padding: 8px 12px;
  cursor: pointer;
  color: #111111;
  font-size: 14px;
  line-height: 1.4;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}
:where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li:first-child) {
  border-top: 0;
}
:where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li[aria-selected="true"]),
:where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li:hover) {
  background: rgba(0, 0, 0, 0.06);
}
:where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li[data-acuris-state="loading"]) {
  color: #666666;
  font-style: italic;
  cursor: default;
}
@media (prefers-color-scheme: dark) {
  :where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions]) {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  :where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li) {
    color: #f0f0f0;
    border-top-color: rgba(255, 255, 255, 0.06);
  }
  :where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li[aria-selected="true"]),
  :where(html:not([data-acuris-default-styles="off"]) [data-acuris-suggestions] li:hover) {
    background: rgba(255, 255, 255, 0.08);
  }
}
`;

function injectDefaultStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(DEFAULT_STYLES_ID)) return;
  const el = document.createElement("style");
  el.id = DEFAULT_STYLES_ID;
  el.textContent = DEFAULT_STYLES;
  document.head.appendChild(el);
}

/**
 * Controlled input with Acuris-powered typeahead. Renders an `<input>`
 * plus an absolutely-positioned `<ul>` of suggestions.
 *
 * As of 0.1.2 the dropdown ships with sensible default styles (white
 * background, dark text, hover state, dark-mode variant) so it works
 * out-of-the-box in modern CSS-reset environments. Customize via
 * `suggestionsClassName` + `renderSuggestion`, or opt out entirely by
 * setting `data-acuris-default-styles="off"` on the root `<html>` tag.
 *
 * Architecture note: the component never touches Acuris directly. It
 * calls `endpoints.suggest` on _your_ backend, which proxies to
 * api.acuris-geo.com with the API key attached server-side.
 */
export const AcurisAddressInput = forwardRef<HTMLInputElement, AcurisAddressInputProps>(
  function AcurisAddressInput(props, ref) {
    const {
      endpoints,
      country,
      value,
      onChange,
      onSelect,
      debounceMs = 200,
      minQueryLength = 3,
      limit = 5,
      state,
      renderSuggestion,
      suggestionsClassName,
      ...inputProps
    } = props;

    const [isOpen, setIsOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);

    useEffect(() => {
      injectDefaultStyles();
    }, []);

    const { suggestions, isLoading } = useAcurisSuggest({
      endpoint: endpoints.suggest,
      country,
      q: value,
      debounceMs,
      minQueryLength,
      limit,
      state,
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
      } else if (e.key === "Enter" && highlight >= 0) {
        e.preventDefault();
        pick(suggestions[highlight]!);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const pick = (hit: SuggestionHit) => {
      // formatted_address is multi-line ("Street 1\nPostcode City\nCOUNTRY").
      // <input> silently strips newlines on display, smashing tokens together,
      // so always present a single-line, comma-separated form to onChange.
      onChange(hitToDisplay(hit));
      onSelect?.(hit);
      setIsOpen(false);
      setHighlight(-1);
    };

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      onChange(e.target.value);
      setIsOpen(true);
      setHighlight(-1);
    };

    const showList = isOpen && (isLoading || suggestions.length > 0);

    return (
      <div data-acuris-input style={{ position: "relative" }}>
        <input
          ref={ref}
          {...inputProps}
          type={inputProps.type ?? "text"}
          value={value}
          onChange={handleChange}
          onFocus={(e) => {
            setIsOpen(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            // Defer so a click on the suggestions list still registers.
            setTimeout(() => setIsOpen(false), 120);
            inputProps.onBlur?.(e);
          }}
          onKeyDown={(e) => {
            handleKeyDown(e);
            inputProps.onKeyDown?.(e);
          }}
          role="combobox"
          aria-expanded={showList}
          aria-controls="acuris-suggestions"
          aria-autocomplete="list"
        />
        {showList && (
          <ul
            id="acuris-suggestions"
            role="listbox"
            className={suggestionsClassName}
            data-acuris-suggestions
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              margin: 0,
              padding: 0,
              listStyle: "none",
              zIndex: 1000,
            }}
          >
            {isLoading && suggestions.length === 0 ? (
              <li role="option" aria-selected={false} data-acuris-state="loading">
                Loading…
              </li>
            ) : (
              suggestions.map((hit, i) => (
                <li
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${hit.formatted_address ?? "row"}-${i}`}
                  role="option"
                  aria-selected={i === highlight}
                  data-acuris-suggestion-index={i}
                  onMouseDown={(e) => {
                    // mousedown beats blur, so the value commits cleanly.
                    e.preventDefault();
                    pick(hit);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  {renderSuggestion ? renderSuggestion(hit, i) : (hit.formatted_address ?? formatHit(hit))}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    );
  },
);

function formatHit(h: SuggestionHit): string {
  return [
    [h.house_number, h.street].filter(Boolean).join(" "),
    [h.city, h.state, h.postcode].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" — ");
}

/**
 * Single-line display string for a suggestion. Prefer Acuris's
 * `formatted_address` (which is multi-line) flattened to commas, falling back
 * to a synthesised form when not present.
 *
 * Exported so demo apps can detect "input value still matches the picked
 * suggestion" without re-deriving the format themselves.
 */
export function hitToDisplay(hit: SuggestionHit): string {
  if (hit.formatted_address) {
    return hit.formatted_address
      .replace(/\r?\n+/g, ", ")
      .replace(/\s*,\s*,\s*/g, ", ")
      .trim();
  }
  return formatHit(hit);
}
