import { Children, isValidElement, type ReactNode } from "react";
import { createHookHarness } from "./hook-fixture";
import SearchOverlay from "@/components/SearchOverlay";
import { ARTICLES } from "../constants";

jest.mock("react", () => ({ ...jest.requireActual("react"), ...jest.requireActual("./hook-fixture").hookMocks }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("../medusa", () => ({ searchProducts: jest.fn().mockResolvedValue([]), formatPrice: () => "" }));

function collectText(node: ReactNode, out: string[] = []): string[] {
  if (typeof node === "string" || typeof node === "number") out.push(String(node));
  else if (Array.isArray(node)) node.forEach((child) => collectText(child, out));
  else if (isValidElement(node)) collectText((node.props as { children?: ReactNode }).children, out);
  return out;
}
const text = (tree: ReactNode) => collectText(tree).join(" ");

function findInputProps(node: ReactNode): Record<string, unknown> | null {
  if (!isValidElement(node)) return null;
  if ((node.type as unknown) === "input") return node.props as Record<string, unknown>;
  for (const child of Children.toArray((node.props as { children?: ReactNode }).children)) {
    const found = findInputProps(child);
    if (found) return found;
  }
  return null;
}

type TreeHarness = { flush(): Promise<ReactNode>; render(): ReactNode; unmount(): void };

const settleDebounce = () => new Promise((resolve) => setTimeout(resolve, 350));

async function type(harness: TreeHarness, value: string) {
  const tree = await harness.flush();
  (findInputProps(tree)!.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
  await harness.flush();
  await settleDebounce();
  return harness.flush();
}

const staticTitle = ARTICLES[0].title;

beforeEach(() => {
  global.document = { cookie: "", body: { style: {} }, addEventListener: jest.fn(), removeEventListener: jest.fn() } as never;
});

afterEach(() => {
  delete (global as { document?: unknown }).document;
});

describe("journal search index policy", () => {
  it("treats a healthy empty CMS as authoritative: no static article guesses", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ articles: [] }) }) as never;
    const harness = createHookHarness(() => SearchOverlay({ isOpen: true, onClose: jest.fn() }));
    await harness.flush();
    const result = text(await type(harness, "photo"));
    expect(result).toContain("No stories found.");
    expect(result).not.toContain(staticTitle);
    harness.unmount();
  });

  it("shows no article guesses while the final index is still resolving", async () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as never;
    const harness = createHookHarness(() => SearchOverlay({ isOpen: true, onClose: jest.fn() }));
    await harness.flush();
    const result = text(await type(harness, "photo"));
    expect(result).toContain("Checking stories...");
    expect(result).not.toContain(staticTitle);
    harness.unmount();
  });

  it("falls back to the built-in editorial list only when the index API fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as never;
    const harness = createHookHarness(() => SearchOverlay({ isOpen: true, onClose: jest.fn() }));
    await harness.flush();
    const result = text(await type(harness, "photo"));
    expect(result).toContain(staticTitle);
    expect(result).not.toContain("Checking stories...");
    harness.unmount();
  });
});
