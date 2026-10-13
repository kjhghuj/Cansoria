import { POST } from "../store/carts/[id]/complete/route";
import { completionWorkflowFixture } from "../../__tests__/workflows/completion-workflow-fixture";
import { Readable } from "stream";
import { deferred } from "../../__tests__/workflows/cart-wrapper-fixture";
jest.mock("@medusajs/medusa/api/store/carts/helpers", () => ({
  refetchCart: jest.fn(async () => ({ id: "cart_a" })),
}));

function welcome(h: ReturnType<typeof completionWorkflowFixture>) {
  h.cart.customer.created_at = new Date().toISOString();
  h.cart.promotions = [{ id: "promo_a" }];
  h.cart.items[0].adjustments = [
    { promotion_id: "promo_a", code: "ART15-SAFE", amount: 15 },
  ];
}

describe("welcome completion through the real shared native hook", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  });
  // Different carts sharing one budget are covered by the actual installed Promotion service
  // transaction tests in welcome-usage-contract; HTTP does not hold a global welcome lock.
  it("keeps same-cart identity serialization after client close until native workflow resolution", async () => {
    const h = completionWorkflowFixture();
    welcome(h);
    const entered = deferred(),
      finish = deferred();
    h.files.getDownloadStream.mockImplementationOnce(async () => {
      entered.resolve();
      await finish.promise;
      return Readable.from([Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,2,0,0,0,144,119,83,222,0,0,0,9,112,72,89,115,0,0,3,232,0,0,3,232,1,181,123,82,107,0,0,0,12,73,68,65,84,8,153,99,104,104,104,0,0,3,4,1,129,30,206,255,166,0,0,0,0,73,69,78,68,174,66,96,130])]);
    });
    const first = POST(h.req, h.res);
    await entered.promise;
    h.res.destroyed = true;
    const retryRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const retry = POST(h.req, retryRes);
    await Promise.resolve();
    expect(h.run).toHaveBeenCalledTimes(1);
    expect(h.order.createOrders).not.toHaveBeenCalled();
    finish.resolve();
    await first;
    await retry;
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
    expect(h.promotion.registerUsage).toHaveBeenCalledTimes(1);
    expect(retryRes.status).toHaveBeenCalledWith(200);
    expect(h.locking.execute.mock.calls.map(([key]) => key)).toEqual([
      "cart-identity:cart_a",
      "cart-identity:cart_a",
    ]);
  });
  it("rejects legacy unbound codes in the registered native hook before order or usage", async () => {
    const h = completionWorkflowFixture();
    welcome(h);
    h.cart.items[0].adjustments[0].code = "ART15-LEGACY";
    h.promotion.listPromotions.mockResolvedValue([]);
    await POST(h.req, h.res);
    expect(h.res.status).toHaveBeenCalledWith(403);
    expect(h.order.createOrders).not.toHaveBeenCalled();
    expect(h.promotion.registerUsage).not.toHaveBeenCalled();
  });
  it("preserves authorized retry after the native order link and coupon usage", async () => {
    const h = completionWorkflowFixture();
    welcome(h);
    await POST(h.req, h.res);
    const canonical = await h.promotion.listPromotions();
    canonical[0].campaign.budget.used = 1;
    h.promotion.listPromotions.mockResolvedValue(canonical);
    h.cart.metadata = {};
    await POST(h.req, h.res);
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
    expect(h.promotion.registerUsage).toHaveBeenCalledTimes(1);
    expect(h.res.status).toHaveBeenCalledWith(200);
  });
  it("rejects system-provider sessions in the shared native hook", async () => {
    const h = completionWorkflowFixture();
    h.cart.payment_collection.payment_sessions[0].provider_id =
      "pp_system_default";
    await POST(h.req, h.res);
    expect(h.res.status).toHaveBeenCalledWith(403);
    expect(h.order.createOrders).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "rejects incomplete or forged portrait references through the native hook (%s)",
    async (forged) => {
      const h = completionWorkflowFixture();
      if (forged) h.cart.metadata.portrait_photos[0].file_id = "victim.png";
      else h.cart.items[0].metadata = {};
      await POST(h.req, h.res);
      expect(h.res.status).toHaveBeenCalledWith(400);
      expect(h.order.createOrders).not.toHaveBeenCalled();
      expect(h.files.getDownloadStream).not.toHaveBeenCalled();
    },
  );
  it("accepts a valid styled reference after actually reading its signed file", async () => {
    const h = completionWorkflowFixture();
    await POST(h.req, h.res);
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
    expect(h.files.getDownloadStream).toHaveBeenCalledWith("file_a");
    expect(h.res.status).toHaveBeenCalledWith(200);
  });
});
