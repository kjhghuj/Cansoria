import { CreditCard, Eye, Paintbrush, ShieldCheck } from "lucide-react";

const usps = [
  { icon: <Paintbrush size={17} />, text: "Hand-Painted by Real Artists" },
  { icon: <Eye size={17} />, text: "Free Digital Preview" },
  { icon: <CreditCard size={17} />, text: "Secure Checkout" },
  { icon: <ShieldCheck size={17} />, text: "Satisfaction Guarantee" },
];

export default function HomeUSPBar() {
  return (
    <section className="bg-[#F3E7D3] border-y border-border">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#D8C5A6]">
          {usps.map((usp) => (
            <div
              key={usp.text}
              className="flex items-center justify-center gap-3 py-4 text-[11px] uppercase tracking-widest text-charcoal-light"
            >
              <span className="text-terracotta">{usp.icon}</span>
              <span>{usp.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
