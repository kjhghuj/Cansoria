/** JSON embedded in a script must not contain a literal closing-tag opener. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
