import { Children, isValidElement, type ReactNode } from "react";
import { createHookHarness } from "./hook-fixture";
import { OrderConfirmedContent } from "@/app/order/confirmed/page";
import { ResetPasswordContent } from "@/app/account/reset-password/page";
import { useAuth } from "../providers";
import { KEY as confirmationKey } from "../order-confirmation";

type TreeHarness = { flush(): Promise<ReactNode>; render(): ReactNode; unmount(): void };

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  ...jest.requireActual("./hook-fixture").hookMocks,
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}));
jest.mock("../providers", () => ({ useAuth: jest.fn() }));
jest.mock("next/navigation", () => ({ useSearchParams: () => ({ get: (key: string) => (key === urlParamKey ? urlParamValue : null) }) }));

let urlParamKey = "ref";
let urlParamValue: string | null = null;
let fetchMock: jest.Mock;
let registerMock: jest.Mock;
let storage: Map<string, string>;
let cookieJar: Map<string, string>;

function collectText(node: ReactNode, out: string[] = []): string[] {
  if (typeof node === "string" || typeof node === "number") out.push(String(node));
  else if (Array.isArray(node)) node.forEach((child) => collectText(child, out));
  else if (isValidElement(node)) collectText((node.props as { children?: ReactNode }).children, out);
  return out;
}
const text = (tree: ReactNode) => collectText(tree).join(" ");
function findProps(node: ReactNode, predicate: (props: Record<string, unknown>) => boolean): Record<string, unknown> | null {
  if (!isValidElement(node)) return null;
  const props = node.props as Record<string, unknown>;
  if (predicate(props)) return props;
  for (const child of Children.toArray(props.children as ReactNode)) {
    const found = findProps(child, predicate);
    if (found) return found;
  }
  return null;
}
function collectProps(node: ReactNode, predicate: (props: Record<string, unknown>) => boolean, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!isValidElement(node)) return out;
  const props = node.props as Record<string, unknown>;
  if (predicate(props)) out.push(props);
  for (const child of Children.toArray(props.children as ReactNode)) collectProps(child, predicate, out);
  return out;
}
const okOrder = (email: string) => Promise.resolve({ ok: true, json: async () => ({ order: { email } }) });
const confirmation = (orderId: string, email: string) =>
  JSON.stringify({ orderId, email, firstName: "Owner", lastName: "Test", savedAt: Date.now() });

beforeEach(() => {
  urlParamKey = "ref";
  urlParamValue = null;
  fetchMock = jest.fn();
  global.fetch = fetchMock as never;
  registerMock = jest.fn().mockResolvedValue(undefined);
  jest.mocked(useAuth).mockReturnValue({ user: null, register: registerMock } as never);
  storage = new Map();
  cookieJar = new Map();
  Object.defineProperty(global, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => void storage.set(key, value),
  } });
  Object.defineProperty(global, "document", { configurable: true, value: {
    get cookie() { return [...cookieJar].map(([key, value]) => `${key}=${value}`).join("; "); },
    set cookie(entry: string) {
      const eq = entry.indexOf("="), name = entry.slice(0, eq);
      if (/(^|;\s*)max-age=0\b/i.test(entry)) cookieJar.delete(name);
      else cookieJar.set(name, entry.slice(eq + 1, entry.indexOf(";")));
    },
  } });
  Object.defineProperty(global, "window", { configurable: true, value: { location: { search: "", pathname: "/order/confirmed", protocol: "https:" }, history: { replaceState: jest.fn() } } });
  Object.defineProperty(global, "location", { configurable: true, value: { protocol: "https:" } });
});

afterEach(() => {
  delete (global as { sessionStorage?: unknown }).sessionStorage;
  delete (global as { document?: unknown }).document;
  delete (global as { window?: unknown }).window;
  delete (global as { location?: unknown }).location;
});

describe("order confirmation identity binding", () => {
  it("ignores the cached order A receipt when an explicit reference for order B must be verified", async () => {
    storage.set(confirmationKey, confirmation("order_a", "a@example.com"));
    urlParamValue = "order_b";
    fetchMock.mockReturnValue(new Promise(() => {}));
    const harness = createHookHarness(() => OrderConfirmedContent());
    const pending = text(await harness.flush());
    expect(pending).toContain("Verifying your order reference");
    expect(pending).not.toContain("Order Confirmed!");
    expect(pending).not.toContain("a@example.com");
    expect(fetchMock).toHaveBeenCalledWith("/api/medusa/store/orders/order_b");
    harness.unmount();
  });

  it("shows order B's verified details without order A's email after same-instance navigation", async () => {
    fetchMock.mockImplementation((url: string) => okOrder(url.endsWith("order_a") ? "a@example.com" : "b@example.com"));
    urlParamValue = "order_a";
    const harness = createHookHarness(() => OrderConfirmedContent());
    const confirmedA = text(await harness.flush());
    expect(confirmedA).toContain("Order Confirmed!");
    expect(confirmedA).toContain("a@example.com");

    // Navigate to a second order in the same page instance while its
    // authorized read is still in flight.
    let resolveB!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { resolveB = resolve; }));
    urlParamValue = "order_b";
    harness.render();
    const verifying = text(await harness.flush());
    expect(verifying).toContain("Verifying your order reference");
    expect(verifying).not.toContain("Order Confirmed!");

    resolveB({ ok: true, json: async () => ({ order: { email: "b@example.com" } }) });
    const confirmedB = text(await harness.flush());
    expect(confirmedB).toContain("Order Confirmed!");
    expect(confirmedB).toContain("b@example.com");
    expect(confirmedB).not.toContain("a@example.com");
    harness.unmount();
  });

  it("drops the first order's registration result when a second order is opened", async () => {
    storage.set(confirmationKey, confirmation("order_b", "b@example.com"));
    fetchMock.mockImplementation(() => okOrder("c@example.com"));
    const harness = createHookHarness(() => OrderConfirmedContent());
    let tree = await harness.flush();
    const passwordInput = findProps(tree, (props) => props.type === "password");
    (passwordInput!.onChange as (event: { target: { value: string } }) => void)({ target: { value: "longenough" } });
    tree = await harness.flush();
    const form = findProps(tree, (props) => typeof props.onSubmit === "function");
    await (form!.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: () => {} });
    const created = text(await harness.flush());
    expect(created).toContain("Account Created!");

    urlParamValue = "order_c";
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    harness.render();
    const switched = text(await harness.flush());
    expect(switched).not.toContain("Account Created!");
    expect(switched).toContain("Verifying your order reference");
    harness.unmount();
  });

  it("prefers the fresh confirmation cache over an older reference cookie and keeps identity consistent", async () => {
    // Another tab restored order A and set the shared reference cookie; this
    // tab just completed order B and stored its own confirmation without a ref.
    storage.set(confirmationKey, confirmation("order_new", "new@example.com"));
    cookieJar.set("cansoria_last_order", "order_old");
    const harness = createHookHarness(() => OrderConfirmedContent());
    const shown = text(await harness.flush());
    expect(shown).toContain("Order Confirmed!");
    expect(shown).toContain("order_new".replace(/^order_/, ""));
    expect(shown).toContain("new@example.com");
    // The cache is this order's receipt: no server verification needed…
    expect(fetchMock).not.toHaveBeenCalled();
    // …and the cross-tab reference is resynced so a later reload cannot
    // resurrect the older order.
    expect(cookieJar.get("cansoria_last_order")).toBe("order_new");
    harness.unmount();
  });

  it("recovers after a reload from the remembered-order cookie when storage is empty", async () => {
    cookieJar.set("cansoria_last_order", "order_z");
    fetchMock.mockImplementation(() => okOrder("z@example.com"));
    const harness = createHookHarness(() => OrderConfirmedContent());
    const recovered = text(await harness.flush());
    expect(recovered).toContain("Order Confirmed!");
    expect(recovered).toContain("z@example.com");
    expect(fetchMock).toHaveBeenCalledWith("/api/medusa/store/orders/order_z");
    // The verified reference is remembered again so another reload still works.
    expect(cookieJar.get("cansoria_last_order")).toBe("order_z");
    harness.unmount();
  });
});

describe("reset password token binding", () => {
  const passwordInputs = (tree: ReactNode) =>
    collectProps(tree, (props) => props.type === "password");

  const submit = async (harness: TreeHarness, value = "longenough") => {
    let tree = await harness.flush();
    const inputs = passwordInputs(tree);
    expect(inputs.length).toBe(2);
    for (const input of inputs) {
      (input.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
      tree = await harness.flush();
    }
    const form = findProps(tree, (props) => typeof props.onSubmit === "function");
    await (form!.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: () => {} });
    return harness.flush();
  };

  beforeEach(() => {
    urlParamKey = "token";
  });

  it("resets the success state when a second reset link is opened", async () => {
    urlParamValue = "a".repeat(24);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const harness = createHookHarness(() => ResetPasswordContent());
    await submit(harness);
    expect(text(await harness.flush())).toContain("Your password has been updated");

    urlParamValue = "b".repeat(24);
    harness.render();
    const switched = text(await harness.flush());
    expect(switched).not.toContain("Your password has been updated");
    expect(switched).toContain("Set New Password");
    harness.unmount();
  });

  it("drops a stale in-flight submission after the token changes", async () => {
    urlParamValue = "a".repeat(24);
    let resolveA!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => { resolveA = resolve; }));
    const harness = createHookHarness(() => ResetPasswordContent());
    let tree = await harness.flush();
    const inputs = passwordInputs(tree);
    (inputs[0]!.onChange as (event: { target: { value: string } }) => void)({ target: { value: "longenough" } });
    (inputs[1]!.onChange as (event: { target: { value: "longenough" } }) => void)({ target: { value: "longenough" } });
    tree = await harness.flush();
    const form = findProps(tree, (props) => typeof props.onSubmit === "function");
    const submitting = (form!.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault: () => {} });

    urlParamValue = "b".repeat(24);
    harness.render();
    await harness.flush();
    resolveA({ ok: true, json: async () => ({ success: true }) });
    await submitting;
    const result = text(await harness.flush());
    expect(result).not.toContain("Your password has been updated");
    expect(result).toContain("Set New Password");
    harness.unmount();
  });

  it("asks for a fresh link when the token is missing", async () => {
    urlParamValue = null;
    const harness = createHookHarness(() => ResetPasswordContent());
    const result = text(await harness.flush());
    expect(result).toContain("missing its reset token");
    expect(result).toContain("Request a New Link");
    harness.unmount();
  });
});
