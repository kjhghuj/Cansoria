/**
 * Text wordmark in the site's own font stack. Rendered as HTML rather than an
 * image so it always uses the locally loaded DM Sans and stays crisp at every
 * size; the standalone SVG copy lives at /brand/cansoria-wordmark.svg for
 * structured data.
 */
export default function BrandLogo() {
  return (
    <span className="brand-wordmark">
      <span className="brand-wordmark-name">Cansoria</span>
      <span className="brand-wordmark-rule" aria-hidden="true" />
      <span className="brand-wordmark-tag">Fine Watches</span>
    </span>
  );
}
