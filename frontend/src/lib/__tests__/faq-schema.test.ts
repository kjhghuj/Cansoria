import { Children, isValidElement, type ReactNode } from "react";
import FAQPage from "@/app/faq/page";
import { STUDIO_FAQ } from "../studio-content";

jest.mock("../medusa", () => ({
  getStoreOrdersOpen: jest.fn(async () => false),
}));
jest.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-nonce": "unit-test-nonce" }),
}));

function collectJsonLd(node: ReactNode): Record<string, unknown>[] {
  const scripts: Record<string, unknown>[] = [];
  (function collect(current: ReactNode) {
    if (
      !isValidElement<{
        children?: ReactNode;
        dangerouslySetInnerHTML?: { __html: string };
      }>(current)
    )
      return;
    if (current.type === "script" && current.props.dangerouslySetInnerHTML)
      scripts.push(JSON.parse(current.props.dangerouslySetInnerHTML.__html));
    Children.forEach(current.props.children, collect);
  })(node);
  return scripts;
}

describe("FAQ page structured data", () => {
  it("emits a FAQPage schema whose questions mirror the rendered page", async () => {
    const page = await FAQPage();
    const faqSchema = collectJsonLd(page).find(
      (entry) => entry["@type"] === "FAQPage",
    ) as
      | {
          mainEntity: {
            name: string;
            acceptedAnswer: { text: string };
          }[];
        }
      | undefined;
    expect(faqSchema).toBeDefined();
    // The first schema question is the first rendered STUDIO_FAQ entry.
    expect(faqSchema?.mainEntity[0].name).toBe(STUDIO_FAQ[0].title);
    expect(faqSchema?.mainEntity[0].acceptedAnswer.text).toBe(
      STUDIO_FAQ[0].text,
    );
    // Page renders STUDIO_FAQ + buying questions + the delivery question.
    expect(faqSchema?.mainEntity.length).toBeGreaterThanOrEqual(10);
    for (const question of faqSchema?.mainEntity ?? []) {
      expect(question.name).toBeTruthy();
      expect(question.acceptedAnswer.text).toBeTruthy();
    }
  });
});
