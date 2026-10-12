import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  releaseLockStep,
  transferCartCustomerWorkflow,
} from "@medusajs/medusa/core-flows";

type Input = {
  id: string;
  customer_id: string;
  additional_data?: Record<string, unknown>;
};
export const validateCansoriaCartClaimStep = createStep(
  "validate-cansoria-cart-claim",
  async (input: Input, { container }) => {
    const { data } = await container
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph({
        entity: "cart",
        fields: ["id", "completed_at"],
        filters: { id: input.id },
      });
    if (!data[0] || data[0].completed_at)
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "This cart is no longer active",
      );
    return new StepResponse(input);
  },
);
export const cansoriaClaimCartWorkflowId = "cansoria-claim-cart";
export const cansoriaClaimCartWorkflow = createWorkflow(
  { name: cansoriaClaimCartWorkflowId, idempotent: false },
  (input: Input) => {
    acquireLockStep({
      key: input.id,
      timeout: 30,
      ttl: 120,
      executeOnSubWorkflow: true,
    });
    const activeInput = validateCansoriaCartClaimStep(input);
    transferCartCustomerWorkflow.runAsStep({ input: activeInput });
    releaseLockStep({ key: input.id, executeOnSubWorkflow: true });
    return new WorkflowResponse(void 0);
  },
);
