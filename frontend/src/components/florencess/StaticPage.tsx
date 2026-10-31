import type { FlStaticPage } from "@/lib/florencess-pages";

/**
 * Reference policy/article layout: a centred uppercase page-title band followed
 * by a 475px reading column. The theme keeps the meta line flush with the
 * column edge while the prose is inset 64px, so both wrappers are preserved.
 *
 * Block elements follow the reference per page: About Us uses bare <div>s whose
 * spacers are <div><br></div> (one 24px line), while the policy pages use <p>
 * with a 10px bottom margin and empty <p> spacers that collapse to zero height.
 */
export default function StaticPage({ page }: { page: FlStaticPage }) {
  const Block = page.blockTag;

  return (
    <div className="fl-page">
      <div className="fl-page__head">
        <h1 className="fl-page__title">{page.label}</h1>
      </div>
      <article className="fl-page__col">
        {/* The reference keeps this line in the DOM with every chip display:none,
            so it stays for parity but renders nothing visible. */}
        {page.meta ? <p className="fl-page__meta fl-sr-only">{page.meta}</p> : null}
        <div className={`fl-page__prose fl-page__prose--${page.blockTag}`}>
          {page.sections.map((section, index) => {
            const key = `s-${index}`;

            if (section.kind === "display") {
              return (
                <h2 className="fl-page__display" key={key}>
                  {section.text}
                </h2>
              );
            }

            if (section.kind === "spacer") {
              return page.blockTag === "div" ? (
                <div className="fl-page__spacer" key={key} aria-hidden="true">
                  <br />
                </div>
              ) : (
                <p className="fl-page__spacer" key={key} aria-hidden="true" />
              );
            }

            if (section.kind === "heading") {
              return (
                <h2 className="fl-page__section-heading" key={key}>
                  {section.text}
                </h2>
              );
            }

            if (section.kind === "divider") {
              return (
                <hr className="fl-page__divider" key={key} aria-label={section.text} />
              );
            }

            if (section.kind === "bullet") {
              return (
                <p className="fl-page__bullet" key={key}>
                  {section.text}
                </p>
              );
            }

            return <Block key={key}>{section.text}</Block>;
          })}
        </div>
      </article>
    </div>
  );
}
