const usps = [
  {
    icon: "🎨",
    title: "100% Hand-Painted",
    text: "Master artists, real impasto oils — never digital prints",
  },
  {
    icon: "✍️",
    title: "Free Proof & Revisions",
    text: "Approve the sketch online, unlimited changes until you love it",
  },
  {
    icon: "🌿",
    title: "Archival Fine Linen",
    text: "Museum-grade, acid-free canvas with non-toxic oil paints",
  },
  {
    icon: "📦",
    title: "Insured Gift-Box Delivery",
    text: "Damage-free, gift-ready packaging shipped worldwide",
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
