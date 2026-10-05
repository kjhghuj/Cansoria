import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface CountryOption {
    value: string;
    label: string;
}

const COUNTRIES: CountryOption[] = [
    { value: "gb", label: "United Kingdom" },
    { value: "us", label: "United States" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
];

interface CountrySelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    required?: boolean;
}

export function CountrySelect({ value, onChange, className = "", required = false }: CountrySelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const selectedOption = COUNTRIES.find((c) => c.value === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full border px-4 py-3 rounded-lg flex items-center justify-between bg-white transition-colors duration-200
          ${isOpen ? "border-terracotta ring-1 ring-terracotta" : "border-gray-200 hover:border-gray-300"}
          ${!selectedOption ? "text-gray-400" : "text-charcoal"}
        `}
            >
                <span className="block truncate">
                    {selectedOption ? selectedOption.label : "Select Country"}
                </span>
                <ChevronDown
                    className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""
                        }`}
                />
            </button>

            {/* Hidden input for form validation if needed, though react state usually handles it */}
            <input
                type="text"
                className="sr-only"
                value={value}
                onChange={() => { }}
                required={required}
                tabIndex={-1}
            />

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-auto animate-fade-in-up origin-top">
                    <ul className="py-1">
                        {COUNTRIES.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm transition-colors
                    ${value === option.value
                                            ? "bg-cream text-charcoal font-medium"
                                            : "text-charcoal-light hover:bg-gray-50 hover:text-charcoal"
                                        }
                  `}
                                >
                                    {option.label}
                                    {value === option.value && (
                                        <Check className="w-4 h-4 text-terracotta" />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
