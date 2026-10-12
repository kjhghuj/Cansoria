import { Children, isValidElement, type ReactNode } from "react";
import { createHookHarness } from "./hook-fixture";
import PhotoUpload from "@/components/PhotoUpload";
import { useCart } from "../providers";

jest.mock("react", () => ({ ...jest.requireActual("react"), ...jest.requireActual("./hook-fixture").hookMocks }));
jest.mock("../providers", () => ({ useCart: jest.fn() }));
type Context = ReturnType<typeof useCart>;
let context: Context;
let onChange: jest.Mock, ensure: jest.Mock, fetchMock: jest.Mock;
function find(node: ReactNode, type: string): Record<string, unknown> {
  if (!isValidElement<{ children?: ReactNode }>(node)) return {};
  if (node.type === type) return node.props;
  for (const child of Children.toArray(node.props.children)) { const found = find(child, type); if (Object.keys(found).length) return found; }
  return {};
}
function select(tree: ReactNode, file: File) {
  const change = find(tree, "input").onChange as (event: { target: { files: File[] } }) => void;
  change({ target: { files: [file] } });
}
const file = { name: "pet.jpg", type: "image/jpeg", size: 100 } as File;
beforeEach(() => {
  onChange = jest.fn(); ensure = jest.fn(); fetchMock = jest.fn(); global.fetch = fetchMock;
  context = { cart: null, cartLoading: false, ensureCart: ensure } as unknown as Context;
  jest.mocked(useCart).mockImplementation(() => context);
  ensure.mockImplementation(async () => { const cart = { id: "cart_selected" }; context = { ...context, cart: cart as Context["cart"] }; return cart; });
  fetchMock.mockResolvedValue(Response.json({ photo: { id: "a".repeat(36), name: "pet.jpg" } }));
  Object.defineProperty(global, "FileReader", { configurable: true, value: class { result = "data:image/jpeg;base64,aGVsbG8="; onload?: () => void; readAsDataURL() { this.onload?.(); } } });
  Object.defineProperty(global, "sessionStorage", { configurable: true, value: { getItem: () => null, setItem: jest.fn() } });
});
describe("actual photo upload intent", () => {
  it("lets an empty-cart visitor pick a file without creating on mount", async () => {
    const harness = createHookHarness(() => PhotoUpload({ onChange })); const tree = await harness.flush();
    expect(find(tree, "button").disabled).toBe(false); expect(find(tree, "input").disabled).toBe(false);
    expect(ensure).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled(); harness.unmount();
  });
  it.each([{ ...file, type: "image/heic" }, { ...file, size: 0 }, { ...file, size: 11 * 1024 * 1024 }])("validates before creating a cart: %p", async invalid => {
    const harness = createHookHarness(() => PhotoUpload({ onChange })); select(await harness.flush(), invalid as File); await harness.flush();
    expect(ensure).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled(); harness.unmount();
  });
  it("creates only after selection and preserves the first upload through cart adoption", async () => {
    const harness = createHookHarness(() => PhotoUpload({ onChange })); select(await harness.flush(), file); await harness.flush();
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/medusa/store/carts/cart_selected/photos', expect.objectContaining({ method: 'POST' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ cartId: "cart_selected", name: "pet.jpg" }));
    expect(find(await harness.flush(), "button").disabled).toBe(false); harness.unmount();
  });
  it("shows creation failure, sends no upload and remains available for retry", async () => {
    ensure.mockRejectedValueOnce(new Error("Unable to create your cart"));
    const harness = createHookHarness(() => PhotoUpload({ onChange })); select(await harness.flush(), file); await harness.flush();
    expect(fetchMock).not.toHaveBeenCalled(); expect(find(await harness.flush(), "button").disabled).toBe(false);
    select(await harness.flush(), file); await harness.flush(); expect(fetchMock).toHaveBeenCalledTimes(1); harness.unmount();
  });
  it("preserves an upload that finishes before React commits the newly created cart", async () => {
    const harness = createHookHarness(() => PhotoUpload({ onChange })); select(await harness.flush(), file);
    // Delay rendering/passive effects while the actual async handler finishes.
    for (let i = 0; i < 12; i++) await Promise.resolve();
    await harness.flush();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ cartId: "cart_selected" })); harness.unmount();
  });
  it("ignores a second stale file-selection event while creation is pending", async () => {
    let resolve!: (cart: { id: string }) => void; ensure.mockReturnValue(new Promise(r => { resolve = r; }));
    const harness = createHookHarness(() => PhotoUpload({ onChange })); const tree = await harness.flush();
    select(tree, file); select(tree, file); expect(ensure).toHaveBeenCalledTimes(1);
    resolve({ id: "cart_selected" }); await harness.flush(); expect(fetchMock).toHaveBeenCalledTimes(1); harness.unmount();
  });
  it("does not upload after the component unmounts while ensuring a cart", async () => {
    let resolve!: (cart: { id: string }) => void; ensure.mockReturnValue(new Promise(r => { resolve = r; }));
    const harness = createHookHarness(() => PhotoUpload({ onChange })); select(await harness.flush(), file); await harness.flush();
    harness.unmount(); resolve({ id: "cart_late" }); await Promise.resolve(); await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
