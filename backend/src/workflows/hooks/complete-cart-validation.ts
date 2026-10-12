import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { StepResponse } from "@medusajs/framework/workflows-sdk";
import { validateCheckoutCompletion } from "../../lib/checkout-completion";

// Medusa 2.21.2 publicly exposes only validate on this workflow. The loader imports this once.
completeCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  await validateCheckoutCompletion(input, cart, container);
  return new StepResponse(void 0);
});
