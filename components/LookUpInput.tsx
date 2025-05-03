import { useEffect, useMemo, useRef, useState } from "preact/hooks";

export interface LookupOption {
  [key: string]: any;
}

interface Props {
  label: string;
  name: string;
  value: string | number | null;
  onChange: (name: string, selectedValue: string | number | null) => void;
  options: LookupOption[];
  optionValueKey: string;
  optionLabelKey: string;
  optionSecondaryLabelKey?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fetchError?: string | null;
}

export default function LookupInput(
  {
    label,
    name,
    value,
    onChange,
    options = [],
    optionValueKey,
    optionLabelKey,
    optionSecondaryLabelKey,
    placeholder = "Type or select...",
    required = false,
    disabled = false,
    fetchError = null,
  }: Props,
) {
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    if (value !== null && value !== undefined && options.length > 0) {
      const selectedOption = options.find((opt) =>
        opt[optionValueKey] == value
      );
      setInputValue(selectedOption ? selectedOption[optionLabelKey] : "");
    } else {
      setInputValue("");
    }
  }, [value, options, optionValueKey, optionLabelKey]);

  const filteredOptions = useMemo(() => {
    if (!inputValue) {
      return options;
    }
    const lowerInput = inputValue.toLowerCase();
    return options.filter((opt) => {
      const labelMatch = String(opt[optionLabelKey] ?? "").toLowerCase()
        .includes(lowerInput);
      const secondaryMatch = optionSecondaryLabelKey
        ? String(opt[optionSecondaryLabelKey] ?? "").toLowerCase().includes(
          lowerInput,
        )
        : false;

      const valueMatch = String(opt[optionValueKey] ?? "").toLowerCase()
        .includes(lowerInput);
      return labelMatch || secondaryMatch || valueMatch;
    });
  }, [
    inputValue,
    options,
    optionLabelKey,
    optionSecondaryLabelKey,
    optionValueKey,
  ]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedItem = listRef.current
        .children[highlightedIndex] as HTMLLIElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: Event) => {
    const text = (e.target as HTMLInputElement).value;
    setInputValue(text);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    if (text === "") {
      onChange(name, null);
    }
  };

  const handleSelectOption = (option: LookupOption) => {
    const selectedValue = option[optionValueKey];
    setInputValue(option[optionLabelKey]);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    onChange(name, selectedValue);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);

        const currentOption = options.find((opt) =>
          opt[optionValueKey] == value
        );
        if (currentOption && inputValue !== currentOption[optionLabelKey]) {
          setInputValue(currentOption[optionLabelKey]);
        } else if (!currentOption && value !== null) {
        }
      }
    }, 150);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const count = filteredOptions.length;

    switch (e.key) {
      case "Escape": {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        const currentOption = options.find((opt) =>
          opt[optionValueKey] == value
        );
        setInputValue(currentOption ? currentOption[optionLabelKey] : "");
        (e.target as HTMLInputElement).blur();
        break;
      }

      case "ArrowDown":
        e.preventDefault();
        if (!isDropdownOpen) {
          setIsDropdownOpen(true);
        }
        setHighlightedIndex((prev) => (prev + 1) % count);
        break;

      case "ArrowUp":
        e.preventDefault();
        if (!isDropdownOpen) {
          setIsDropdownOpen(true);
        }
        setHighlightedIndex((prev) => (prev - 1 + count) % count);
        break;

      case "Enter":
        if (
          isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < count
        ) {
          e.preventDefault();
          handleSelectOption(filteredOptions[highlightedIndex]);
        }

        break;

      case "Tab":
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);

  return (
    <div className="form-group lookup-input-container" ref={containerRef}>
      <label htmlFor={name}>{label}{required && "*"}</label>
      <div className="lookup-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          id={name}
          name={name}
          value={inputValue}
          onInput={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required && (value === null || value === undefined)}
          disabled={disabled || !!fetchError}
          autoComplete="off"
          aria-invalid={required && !value && inputValue !== ""}
          role="combobox"
          aria-expanded={isDropdownOpen}
          aria-autocomplete="list"
          aria-controls={`${name}-listbox`}
          aria-activedescendant={highlightedIndex >= 0
            ? `${name}-option-${highlightedIndex}`
            : undefined}
        />
      </div>

      {isDropdownOpen && !disabled && !fetchError && (
        <ul
          ref={listRef}
          className="lookup-dropdown"
          id={`${name}-listbox`}
          role="listbox"
        >
          {filteredOptions.length > 0
            ? filteredOptions.map((option, index) => (
              <li
                key={option[optionValueKey]}
                id={`${name}-option-${index}`}
                role="option"
                className={index === highlightedIndex ? "highlighted" : ""}
                aria-selected={index === highlightedIndex}
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="lookup-label">
                  {option[optionLabelKey]}
                </span>
                {optionSecondaryLabelKey && (
                  <span className="lookup-secondary-label">
                    ({option[optionSecondaryLabelKey]}){" "}
                  </span>
                )}
              </li>
            ))
            : (
              <li
                className="lookup-no-options"
                role="option"
                aria-disabled="true"
              >
                No matches found
              </li>
            )}
        </ul>
      )}
      {fetchError && <div className="error">{fetchError}</div>}
    </div>
  );
}
