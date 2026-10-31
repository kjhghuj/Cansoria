import { Children, isValidElement, type ReactNode } from "react";
import FAQPage from "@/app/faq/page";
import { FL_FAQ_GROUPS } from "../florencess-content";

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
  it("emits one FAQPage question per rendered accordion group", async () => {
    const page = await FAQPage();
    const schema = collectJsonLd(page).find((entry) => entry["@type"] === "FAQPage") as
      | { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
      | undefined;

    expect(schema).toBeDefined();
    expect(schema?.mainEntity).toHaveLength(FL_FAQ_GROUPS.length);
    expect(schema?.mainEntity[0].name).toBe(FL_FAQ_GROUPS[0].question);
    expect(schema?.mainEntity[0].acceptedAnswer.text).toBe(FL_FAQ_GROUPS[0].blocks.join(" "));
    for (const question of schema?.mainEntity ?? []) {
      expect(question.name).toBeTruthy();
      expect(question.acceptedAnswer.text).toBeTruthy();
    }
  });
});
