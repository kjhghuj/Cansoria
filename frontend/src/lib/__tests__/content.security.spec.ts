import { describe, expect, it } from "@jest/globals";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HtmlContentRenderer from "@/app/journal/[slug]/HtmlContentRenderer";
import type { StoreProduct } from "@/lib/types";

function render(content: string) {
  return renderToStaticMarkup(createElement(HtmlContentRenderer, {
    content,
    productsMap: new Map(),
    featuredProduct: null,
  }));
}

describe("journal content security", () => {
  it("removes executable and embedded document elements before rendering", () => {
    const html = render('<p>文章</p><script>alert(1)</script><style>body{display:none}</style><iframe srcdoc="<script>alert(1)</script>"></iframe><object data="https://evil.example"></object><svg><script>alert(1)</script></svg>');
    expect(html).toContain("文章");
    expect(html).not.toMatch(/<(script|style|iframe|object|svg)\b/i);
    expect(html).not.toContain("alert(1)");
  });

  it("removes event handlers, unsafe URL schemes, and data URLs", () => {
    const html = render('<p onclick="alert(1)">hello</p><a href="jav&#x61;script:alert(1)">bad</a><img src="data:image/svg+xml;base64,PHN2Zz4=" onerror="alert(1)"><a href="https://cansoria.com/journal" target="_blank">safe</a>');
    expect(html).not.toMatch(/onclick|onerror|javascript:|data:image|srcdoc/i);
    expect(html).toContain('href="https://cansoria.com/journal"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("preserves headings, lists, images, Unicode, and product shortcodes", () => {
    const html = renderToStaticMarkup(createElement(HtmlContentRenderer, {
      content: '<h2>油画 🎨</h2><ul><li><strong>Art</strong></li></ul><img src="https://images.unsplash.com/photo" alt="painting"><p>[product:sample]</p>',
      productsMap: new Map([['sample', { id: 'prod_1', handle: 'sample', title: 'Sample painting', thumbnail: 'https://images.unsplash.com/sample' } as StoreProduct]]),
      featuredProduct: null,
    }));
    expect(html).toContain('<h2>油画 🎨</h2>');
    expect(html).toContain('<ul><li><strong>Art</strong></li></ul>');
    expect(html).toContain('alt="painting"');
    expect(html).toContain('Sample painting');
    expect(html).not.toContain('[product:sample]');
    expect(render("")).toBe("");
  });
});
