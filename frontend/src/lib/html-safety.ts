import sanitizeHtml from "sanitize-html";

/** Sanitize CMS HTML on the server before parsing it into React elements. */
export function sanitizeArticleHtml(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [
      "p", "div", "span", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "em", "b", "i", "u", "s", "del", "sup", "sub", "blockquote",
      "ul", "ol", "li", "pre", "code", "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      ol: ["start"],
      th: ["scope", "colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    nonTextTags: ["script", "style", "textarea", "option", "iframe", "object", "svg", "math", "xmp"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
        },
      }),
    },
  });
}
