const usps = [
  {
    icon: "🎨",
    title: "Four Style Concepts",
    text: "Illustrated ideas for your preferred mood and colours",
  },
  {
    icon: "✍️",
    title: "Photo Guidance",
    text: "Prepare a clear reference and the expression you love",
  },
  {
    icon: "🌿",
    title: "Personal Preferences",
    text: "Describe the background and details that matter",
  },
  {
    icon: "📦",
    title: "Commissions in Preparation",
    text: "Production and service arrangements to be confirmed",
  },
];

export default function HomeUSPBar() {
  return (
    <section className="bg-cream-card border-y border-border">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {usps.map((usp) => (
            <div
              key={usp.title}
              className="flex items-center justify-center gap-3.5 px-4 py-5"
            >
              <span className="text-xl shrink-0" aria-hidden="true">
                {usp.icon}
              </span>
              <div className="text-left">
                <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal leading-tight">
                  {usp.title}
                </p>
                <p className="text-[11px] text-charcoal-light leading-snug mt-1">
                  {usp.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
