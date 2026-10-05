import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Creates an admin user for the Cansoria Medusa backend.
 *
 * PowerShell:
 *   $env:ADMIN_EMAIL="admin@cansoria.com"
 *   $env:ADMIN_PASSWORD="replace_with_secure_admin_password"
 *   npx.cmd medusa exec ./src/scripts/create-admin-user.ts
 */
export default async function createAdminUser({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const authModuleService = container.resolve(Modules.AUTH);
  const userModuleService = container.resolve(Modules.USER);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.error("Missing required environment variables.");
    logger.error("Please set ADMIN_EMAIL and ADMIN_PASSWORD.");
    logger.error("Example (PowerShell):");
    logger.error('  $env:ADMIN_EMAIL="admin@cansoria.com"');
    logger.error('  $env:ADMIN_PASSWORD="replace_with_secure_admin_password"');
    logger.error("  npx.cmd medusa exec ./src/scripts/create-admin-user.ts");
    throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables");
  }

  logger.info("======================================");
  logger.info("Creating admin user...");
  logger.info(`Email: ${adminEmail}`);
  logger.info("======================================");

  try {
    const existingUsers = await userModuleService.listUsers({
      email: adminEmail,
    });

    if (existingUsers.length > 0) {
      logger.warn("User with this email already exists.");
      logger.info(`User ID: ${existingUsers[0].id}`);
      logger.info("Use a different email or remove the existing user before creating a new one.");
      return;
    }

    const { success, authIdentity, error } = await authModuleService.register("emailpass", {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    } as any);

    if (!success || !authIdentity) {
      logger.error("Failed to register auth identity:");
      logger.error(error || "Unknown error");
      throw new Error(error || "Failed to register auth identity");
    }

    logger.info(`Auth identity created: ${authIdentity.id}`);

    const { result: createdUser } = await createUserAccountWorkflow(container).run({
      input: {
        authIdentityId: authIdentity.id,
        userData: {
          email: adminEmail,
          first_name: "Admin",
          last_name: "User",
        },
      },
    });

    logger.info("======================================");
    logger.info("Admin user created successfully.");
    logger.info(`Email: ${createdUser.email}`);
    logger.info(`User ID: ${createdUser.id}`);
    logger.info(`Auth Identity ID: ${authIdentity.id}`);
    logger.info("Admin URL: http://localhost:9030/app/login");
    logger.info("Password: [the password you set in ADMIN_PASSWORD]");
    logger.info("======================================");
  } catch (error) {
    logger.error("Failed to create admin user:");
    logger.error(error);
    throw error;
  }
}
