import { createHookHarness } from "./hook-fixture";
import { Providers } from "../providers";
import * as medusa from "../medusa";
import type { StoreCart } from "../types";

jest.mock("react", () => ({ ...jest.requireActual("react"), ...jest.requireActual("./hook-fixture").hookMocks }));
jest.mock("../medusa", () => ({
  getRegion: jest.fn(), getCustomer: jest.fn(), getCart: jest.fn(), createCart: jest.fn(),
  addToCart: jest.fn(), updateCartOwnership: jest.fn(), updateCustomerMetadata: jest.fn(),
  login: jest.fn(), register: jest.fn(), logout: jest.fn(),
}));
type CartContext = { cart: StoreCart | null; cartLoading: boolean; ensureCart: () => Promise<StoreCart>; addItem: (id: string) => Promise<void>; refreshCart: () => Promise<void> };
type AuthContext = { logout: () => Promise<void>; login: (email: string, password: string) => Promise<void> };
const cart = { id: "cart_new", items: [], region_id: "reg_test" } as unknown as StoreCart;
const storage = new Map<string, string>();
function contexts(tree: unknown) {
  // Providers may nest additional context levels (region, store status, …);
  // classify each context value by its shape instead of its nesting depth.
  const values: Record<string, unknown>[] = [];
  let node = (tree as { props: { children?: unknown } }).props.children as
    | { props?: { value?: Record<string, unknown>; children?: unknown } }
    | undefined
    | null;
  while (node?.props) {
    if (node.props.value && typeof node.props.value === "object") values.push(node.props.value);
    node = node.props.children as typeof node;
  }
  const auth = values.find((value) => "login" in value && "logout" in value) as AuthContext;
  const cartContext = values.find((value) => "addItem" in value && "refreshCart" in value) as CartContext;
  return { auth, cart: cartContext };
}
function mount() { return createHookHarness(() => Providers({ children: null })); }
beforeEach(() => {
  jest.clearAllMocks(); storage.clear();
  const fakeStorage = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) };
  Object.defineProperty(global, "localStorage", { configurable: true, value: fakeStorage });
  Object.defineProperty(global, "sessionStorage", { configurable: true, value: fakeStorage });
  jest.mocked(medusa.getRegion).mockResolvedValue({ id: "reg_test" } as never);
  jest.mocked(medusa.getCustomer).mockResolvedValue(null);
  jest.mocked(medusa.createCart).mockResolvedValue(cart);
  jest.mocked(medusa.updateCartOwnership).mockResolvedValue({ ...cart, customer_id: "cus_test" } as never);
  jest.mocked(medusa.addToCart).mockResolvedValue({ ...cart, items: [{ id: "item_test", quantity: 1 }] } as never);
});

describe("actual provider lazy cart lifecycle", () => {
  it("browses without creating a cart and exposes a ready empty state", async () => {
    const harness = mount(); const context = contexts(await harness.flush()).cart;
    expect(context.cart).toBeNull(); expect(context.cartLoading).toBe(false);
    expect(medusa.createCart).not.toHaveBeenCalled(); harness.unmount();
  });
  it("creates on the first add and reuses that cart on the next add", async () => {
    const harness = mount(); let context = contexts(await harness.flush()).cart;
    await context.addItem("variant_1"); context = contexts(await harness.flush()).cart;
    await context.addItem("variant_2");
    expect(medusa.createCart).toHaveBeenCalledTimes(1);
    expect(medusa.addToCart).toHaveBeenNthCalledWith(1, "cart_new", "variant_1", 1, undefined);
    expect(medusa.addToCart).toHaveBeenNthCalledWith(2, "cart_new", "variant_2", 1, undefined);
    harness.unmount();
  });
  it("restores an existing cart without creating one", async () => {
    storage.set("cansoria_cart_id", "cart_existing");
    jest.mocked(medusa.getCart).mockResolvedValue({ ...cart, id: "cart_existing" });
    const harness = mount(); expect(contexts(await harness.flush()).cart.cart?.id).toBe("cart_existing");
    expect(medusa.createCart).not.toHaveBeenCalled(); harness.unmount();
  });
  it("clears an expired cart without replacing it until intent", async () => {
    storage.set("cansoria_cart_id", "cart_old"); jest.mocked(medusa.getCart).mockResolvedValue(null);
    const harness = mount(); const context = contexts(await harness.flush()).cart;
    expect(context.cart).toBeNull(); expect(medusa.createCart).not.toHaveBeenCalled();
    await context.ensureCart(); expect(medusa.createCart).toHaveBeenCalledTimes(1); harness.unmount();
  });
  it("refreshing a completed cart does not create a replacement", async () => {
    storage.set("cansoria_cart_id", "cart_new"); jest.mocked(medusa.getCart).mockResolvedValue(cart);
    const harness = mount(); const context = contexts(await harness.flush()).cart;
    jest.mocked(medusa.getCart).mockResolvedValue({ ...cart, completed_at: new Date() });
    await context.refreshCart(); expect(contexts(await harness.flush()).cart.cart).toBeNull();
    expect(medusa.createCart).not.toHaveBeenCalled(); harness.unmount();
  });
  it("blocks a parallel first add while a cart is being created", async () => {
    let resolve!: (value: StoreCart) => void;
    jest.mocked(medusa.createCart).mockReturnValue(new Promise(r => { resolve = r; }));
    const harness = mount(); const context = contexts(await harness.flush()).cart;
    const first = context.addItem("variant_1"); await Promise.resolve();
    await expect(context.addItem("variant_2")).rejects.toThrow("updating");
    resolve(cart); await first; expect(medusa.createCart).toHaveBeenCalledTimes(1); harness.unmount();
  });
  it("does not add a line when cart creation fails and allows retry", async () => {
    jest.mocked(medusa.createCart).mockResolvedValueOnce(null);
    const harness = mount(); let context = contexts(await harness.flush()).cart;
    await expect(context.addItem("variant_1")).rejects.toThrow();
    expect(medusa.addToCart).not.toHaveBeenCalled();
    context = contexts(await harness.flush()).cart; await context.addItem("variant_1");
    expect(medusa.addToCart).toHaveBeenCalledTimes(1); harness.unmount();
  });
  it("does not create a guest cart after logout", async () => {
    jest.mocked(medusa.getCustomer).mockResolvedValue({ id: "cus_test", metadata: {} } as never);
    const harness = mount(); const context = contexts(await harness.flush());
    await context.auth.logout(); await harness.flush();
    expect(medusa.createCart).not.toHaveBeenCalled(); harness.unmount();
  });
  it("claims a lazily created cart for a logged-in customer before adding", async () => {
    jest.mocked(medusa.getCustomer).mockResolvedValue({ id: "cus_test", metadata: {} } as never);
    const harness = mount(); const context = contexts(await harness.flush()).cart;
    expect(medusa.createCart).not.toHaveBeenCalled(); await context.addItem("variant_1");
    expect(medusa.updateCartOwnership).toHaveBeenCalledWith("cart_new");
    expect(medusa.updateCustomerMetadata).toHaveBeenCalledWith({ active_cart_id: "cart_new" });
    expect(jest.mocked(medusa.updateCartOwnership).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(medusa.addToCart).mock.invocationCallOrder[0]); harness.unmount();
  });
  it("keeps successful cart creation for retry when ownership fails", async () => {
    jest.mocked(medusa.getCustomer).mockResolvedValue({ id: "cus_test", metadata: {} } as never);
    jest.mocked(medusa.updateCartOwnership).mockRejectedValueOnce(new Error("temporary claim failure"));
    const harness = mount(); let context = contexts(await harness.flush()).cart;
    await expect(context.addItem("variant_1")).rejects.toThrow("temporary claim failure");
    expect(medusa.addToCart).not.toHaveBeenCalled(); context = contexts(await harness.flush()).cart;
    await context.addItem("variant_1"); expect(medusa.createCart).toHaveBeenCalledTimes(1); harness.unmount();
  });
  it("abandons an in-flight creation after account changes before adding a line", async () => {
    let resolve!: (value: StoreCart) => void;
    jest.mocked(medusa.createCart).mockReturnValue(new Promise(r => { resolve = r; }));
    const harness = mount(); const context = contexts(await harness.flush());
    const add = context.cart.addItem("variant_1"); await Promise.resolve();
    await context.auth.logout(); await harness.flush(); resolve(cart);
    await expect(add).rejects.toThrow("account changed");
    expect(medusa.addToCart).not.toHaveBeenCalled();
    expect(contexts(await harness.flush()).cart.cart).toBeNull(); harness.unmount();
  });
});
