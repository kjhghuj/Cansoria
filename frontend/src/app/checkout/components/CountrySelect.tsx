import type { StoreRegion } from "@/lib/types";

export function CountrySelect({
  value,
  onChange,
  countries,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  countries: NonNullable<StoreRegion["countries"]>;
  required?: boolean;
}) {
  return (
    <select
      id="checkout-country"
      name="country"
      autoComplete="shipping country"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="w-full rounded-xl border border-border bg-white px-4 py-3 text-charcoal focus:outline-none focus:border-toffee focus:ring-2 focus:ring-toffee/15"
    >
      <option value="">Select Country</option>
      {countries.map((country) => (
        <option key={country.iso_2} value={country.iso_2}>
          {country.display_name || country.name}
        </option>
      ))}
    </select>
  );
}
