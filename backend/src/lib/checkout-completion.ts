import type {
  IFileModuleService,
  IPromotionModuleService,
  MedusaContainer,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";
import { Readable } from "stream";
import {
  assertDecodableImage,
  findPhoto,
  MAX_PHOTO_BYTES,
  PORTRAIT_STYLES,
  type PortraitPhoto,
} from "./portrait-photos";
import { ORDERS_CLOSED_MESSAGE, storeOrdersOpenForScope } from "./store-status";
import { welcomePromotionEligible } from "./welcome-promotions";

type Adjustment = { promotion_id?: string | null; code?: string | null };
type Line = {
  product_id?: string | null;
  product_handle?: string | null;
  variant?: { product?: { id?: string | null } | null } | null;
  metadata?: Record<string, unknown> | null;
  adjustments?: Adjustment[] | null;
};
/** The installed completeCartFields shape; relation lookups never replace this snapshot. */
export type CompletionCart = {
  id: string;
  completed_at?: Date | string | null;
  email?: string | null;
  customer?: {
    id?: string;
    email?: string | null;
    has_account?: boolean;
    created_at?: Date | string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  items: Line[];
  shipping_methods: { adjustments?: Adjustment[] | null }[];
  promotions: { id?: string }[];
  payment_collection?: {
    payment_sessions?: { provider_id?: string; status?: string }[] | null;
  } | null;
};

export class CheckoutCompletionError extends MedusaError {
  readonly status: 400 | 403;
  constructor(message: string, status: 400 | 403 = 400) {
    super(
      status === 403
        ? MedusaError.Types.NOT_ALLOWED
        : MedusaError.Types.INVALID_DATA,
      message,
    );
    this.status = status;
  }
}
function deny(message: string, status: 400 | 403 = 400): never {
  throw new CheckoutCompletionError(message, status);
}
function aborted(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason;
}

/** Bound a read-only operation; attach handlers even if its provider finishes late. */
async function bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  aborted(signal);
  let onAbort!: () => void;
  const stop = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([work, stop]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function imageMime(head: Buffer): string | undefined {
  if (head.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    return "image/jpeg";
  if (
    head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    head.length >= 12 &&
    head.toString("ascii", 0, 4) === "RIFF" &&
    head.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
}

async function readPhoto(
  files: Pick<IFileModuleService, "getDownloadStream">,
  photo: PortraitPhoto,
  signal: AbortSignal,
  total: { bytes: number },
) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(
    () =>
      controller.abort(
        new CheckoutCompletionError("Photo validation timed out"),
      ),
    5000,
  );
  let stream: Readable | undefined;
  const destroy = () => stream?.destroy();
  controller.signal.addEventListener("abort", destroy, { once: true });
  try {
    aborted(controller.signal);
    // getDownloadStream is the public File Module existence/read contract. retrieveFile only signs URLs.
    const acquisition = files.getDownloadStream(photo.file_id).then((value) => {
      if (controller.signal.aborted) {
        value.destroy();
        throw controller.signal.reason;
      }
      stream = value;
      return value;
    });
    stream = await bounded(acquisition, controller.signal);
    if (!(stream instanceof Readable)) deny("Photo cannot be read");
    const consume = async () => {
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of stream!) {
        aborted(controller.signal);
        if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array))
          deny("Invalid photo stream");
        const buffer = Buffer.from(chunk as Uint8Array);
        size += buffer.length;
        total.bytes += buffer.length;
        if (size > MAX_PHOTO_BYTES || total.bytes > 200 * 1024 * 1024)
          deny("Photo size limit exceeded");
        chunks.push(buffer);
      }
      const bytes = Buffer.concat(chunks, size);
      // The file must still be the signed, fully decodable image that was
      // validated at upload: same size, same type, real pixels end to end.
      if (!size || size !== photo.size || imageMime(bytes) !== photo.mime)
        deny("Photo size or file type has changed");
      await assertDecodableImage(bytes, photo.mime);
    };
    await bounded(consume(), controller.signal);
  } catch (error) {
    if (error instanceof CheckoutCompletionError) throw error;
    throw new CheckoutCompletionError(
      "A referenced photo is unavailable. Please upload it again.",
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", destroy);
    destroy();
    // Marks pending acquisition as cancelled so its installed then handler destroys a late stream.
    controller.abort(new CheckoutCompletionError("Photo validation ended"));
  }
}

async function validateSnapshot(
  input: { id: string },
  cart: CompletionCart,
  container: MedusaContainer,
  signal: AbortSignal,
) {
  const now = Date.now();
  if (!cart || input.id !== cart.id) deny("Invalid completion cart snapshot");
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: links } = await bounded(
    query.graph({
      entity: "order_cart",
      fields: ["order_id"],
      filters: { cart_id: cart.id },
    }),
    signal,
  );
  aborted(signal);
  // Native completion skips order creation and usage on this same order_cart idempotent branch.
  if (
    links.some(
      (link) => typeof link.order_id === "string" && link.order_id.length,
    )
  )
    return;
  if (cart.completed_at) deny("Completed cart has no linked order");
  // A closed store blocks new orders at the authoritative completion gate, including
  // the payment callback. A cart whose Stripe session is already paid may still
  // complete so an authorized payment is never stranded by a status change.
  const paidStripeSession = cart.payment_collection?.payment_sessions?.some(
    (session) =>
      session?.provider_id === "pp_stripe_stripe" &&
      // Medusa marks a captured session "captured"; "authorized" precedes capture.
      (session.status === "authorized" || session.status === "captured"),
  );
  if (!paidStripeSession && !(await storeOrdersOpenForScope(container)))
    deny(ORDERS_CLOSED_MESSAGE, 403);
  if (
    !Array.isArray(cart.items) ||
    !cart.items.length ||
    !Array.isArray(cart.promotions) ||
    !Array.isArray(cart.shipping_methods)
  )
    deny("Incomplete completion cart snapshot");
  const sessions = cart.payment_collection?.payment_sessions;
  if (
    !Array.isArray(sessions) ||
    !sessions.length ||
    sessions.some((session) => session?.provider_id !== "pp_stripe_stripe")
  )
    deny("Unsupported payment provider", 403);

  const productIds = new Set<string>();
  for (const item of cart.items) {
    if (!item) deny("Missing product relationship");
    const direct = item.product_id,
      nested = item.variant?.product?.id;
    if (direct && nested && direct !== nested)
      deny("Inconsistent product relationship");
    const id = nested || direct;
    if (typeof id !== "string" || !id) deny("Missing product relationship");
    productIds.add(id);
  }
  const { data: products } = await bounded(
    query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { id: [...productIds] },
    }),
    signal,
  );
  aborted(signal);
  const handles = new Map(
    products.map((product) => [product.id, product.handle]),
  );
  const photos = new Map<string, PortraitPhoto>();
  for (const item of cart.items) {
    const handle = handles.get(item.variant?.product?.id || item.product_id!);
    if (typeof handle !== "string" || !handle)
      deny("Missing product relationship");
    if (
      handle !== "pet-portrait-oil-painting" &&
      item.product_handle !== "pet-portrait-oil-painting"
    )
      continue;
    const portrait = item.metadata?.portrait as
      Record<string, unknown> | null | undefined;
    if (
      !portrait ||
      !PORTRAIT_STYLES.includes(
        portrait.style as (typeof PORTRAIT_STYLES)[number],
      ) ||
      portrait.source_cart_id !== cart.id ||
      typeof portrait.photo_id !== "string"
    )
      deny(
        "Each pet portrait needs a valid photo and painting style. Please customize it again.",
      );
    const photo = findPhoto(cart.metadata, cart.id, portrait.photo_id);
    if (
      !photo ||
      !photo.file_id ||
      !Number.isSafeInteger(photo.size) ||
      photo.size <= 0 ||
      photo.size > MAX_PHOTO_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.mime)
    )
      deny(
        "Each pet portrait needs a valid photo and painting style. Please customize it again.",
      );
    const prior = photos.get(photo.file_id);
    if (prior && (prior.size !== photo.size || prior.mime !== photo.mime))
      deny("Inconsistent signed photo references");
    photos.set(photo.file_id, photo);
  }
  if (photos.size > 20) deny("Photo limit reached for this cart");
  const photoController = new AbortController();
  const stopPhotos = () => photoController.abort(signal.reason);
  signal.addEventListener("abort", stopPhotos, { once: true });
  if (signal.aborted) stopPhotos();
  const photoTimer = setTimeout(
    () =>
      photoController.abort(
        new CheckoutCompletionError("Photo validation timed out"),
      ),
    25000,
  );
  try {
    const files = container.resolve<IFileModuleService>(Modules.FILE);
    const total = { bytes: 0 };
    for (const photo of photos.values())
      await readPhoto(files, photo, photoController.signal, total);
  } finally {
    clearTimeout(photoTimer);
    signal.removeEventListener("abort", stopPhotos);
  }
  aborted(signal);

  const linkedIds = new Set(cart.promotions.map((p) => p?.id));
  if (linkedIds.has(undefined) || linkedIds.has(""))
    deny("Missing promotion relationship");
  const adjustments: Adjustment[] = [];
  for (const line of [...cart.items, ...cart.shipping_methods]) {
    if (!line || !Array.isArray(line.adjustments))
      deny("Missing promotion adjustments");
    adjustments.push(...line.adjustments);
  }
  if (!linkedIds.size && !adjustments.length) return;
  const ids = [
    ...new Set(
      [...linkedIds, ...adjustments.map((a) => a?.promotion_id)].filter(
        (id): id is string => typeof id === "string" && !!id,
      ),
    ),
  ];
  const codes = [
    ...new Set(
      adjustments
        .map((a) => a?.code)
        .filter((code): code is string => typeof code === "string" && !!code),
    ),
  ];
  const promotions = container.resolve<IPromotionModuleService>(
    Modules.PROMOTION,
  );
  const canonical = await bounded(
    promotions.listPromotions(
      { $or: [{ id: ids }, { code: codes }] },
      { relations: ["rules", "rules.values", "campaign.budget"], take: null },
    ),
    signal,
  );
  aborted(signal);
  const byId = new Map(canonical.map((p) => [p.id, p]));
  for (const id of linkedIds)
    if (!byId.has(id!)) deny("Unknown linked promotion", 403);
  for (const adjustment of adjustments) {
    const promotion = adjustment && byId.get(adjustment.promotion_id!);
    if (
      !promotion ||
      !linkedIds.has(promotion.id) ||
      !adjustment.code ||
      adjustment.code !== promotion.code
    )
      deny("Promotion adjustment does not match its linked promotion", 403);
  }
  for (const id of linkedIds) {
    const promotion = byId.get(id!)!;
    if (!/^ART15-/i.test(promotion.code || "")) continue;
    if (promotion.campaign?.ends_at != null)
      deny(
        "This older welcome code requires support before checkout. Please contact us.",
        403,
      );
    if (
      !cart.customer ||
      !welcomePromotionEligible(promotion, cart.customer, cart.email, now) ||
      !adjustments.some(
        (a) => a.promotion_id === id && a.code === promotion.code,
      )
    )
      deny("Welcome code is not eligible for this account", 403);
    // used < 1 is an early rejection only. Installed registerUsage locks/refreshes budget in its PG transaction.
  }
}

export async function validateCheckoutCompletion(
  input: { id: string },
  cart: CompletionCart,
  container: MedusaContainer,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new CheckoutCompletionError("Checkout validation timed out"),
      ),
    35000,
  );
  try {
    await bounded(
      validateSnapshot(input, cart, container, controller.signal),
      controller.signal,
    );
  } finally {
    clearTimeout(timer);
  }
}
