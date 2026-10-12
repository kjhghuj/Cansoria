import type { UpdateCartWorkflowInputDTO } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  releaseLockStep,
  updateCartsStep,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { guestCustomerForContainer } from "../lib/guest-customer";
import { registeredOwner } from "../lib/resource-access";

type Input = UpdateCartWorkflowInputDTO & {
  additional_data?: Record<string, unknown>;
};
export const prepareCansoriaCartUpdateStep = createStep(
  "prepare-cansoria-cart-update",
  async (input: Input, { container }) => {
    const { data } = await container
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph({
        entity: "cart",
        fields: [
          "id",
          "completed_at",
          "customer_id",
          "customer.has_account",
          "metadata",
        ],
        filters: { id: input.id },
      });
    const cart = data[0];
    if (!cart || cart.completed_at)
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "This cart is no longer active",
      );
    const prepared = { ...input };
    if ("metadata" in prepared && Array.isArray(cart.metadata?.portrait_photos))
      prepared.metadata = {
        ...prepared.metadata,
        portrait_photos: cart.metadata.portrait_photos,
      };
    const guestId =
      !registeredOwner(cart) && typeof input.email === "string"
        ? await guestCustomerForContainer(container, input.email)
        : undefined;
    return new StepResponse({
      input: prepared,
      preselection: guestId ? [{ id: input.id, customer_id: guestId }] : [],
    });
  },
);

export const cansoriaUpdateCartWorkflowId = "cansoria-update-cart";
export const cansoriaUpdateCartWorkflow = createWorkflow(
  { name: cansoriaUpdateCartWorkflowId, idempotent: false },
  (input: Input) => {
    acquireLockStep({
      key: input.id,
      timeout: 30,
      ttl: 120,
      executeOnSubWorkflow: true,
    });
    const prepared = prepareCansoriaCartUpdateStep(input);
    // Public updateCartsStep preserves the original customer for native compensation.
    const selected = updateCartsStep(prepared.preselection).config({
      name: "preselect-guest-customer",
    });
    const childInput = transform(
      { prepared, selected },
      ({ prepared }) => prepared.input,
    );
    // SDK runAsStep supplies parentStepIdempotencyKey; native child acquire/release skip re-locking.
    updateCartWorkflow.runAsStep({ input: childInput });
    releaseLockStep({ key: input.id, executeOnSubWorkflow: true });
    return new WorkflowResponse(void 0);
  },
);
