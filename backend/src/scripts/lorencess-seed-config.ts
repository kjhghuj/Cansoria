/**
 * Configuration gate for the LORENCESS dev seed.
 *
 * The seed creates an admin user, so its credentials never live in source:
 * they come from the environment, must be explicitly provided, and the seed
 * refuses to run against a production deployment. Error messages name the
 * missing variable but never echo the password.
 */
export type SeedAdminConfig = {
  email: string;
  password: string;
};

export const SEED_ADMIN_EMAIL_VAR = "LORENCESS_SEED_ADMIN_EMAIL";
export const SEED_ADMIN_PASSWORD_VAR = "LORENCESS_SEED_ADMIN_PASSWORD";
export const SEED_ADMIN_MIN_PASSWORD_LENGTH = 12;

export function readSeedAdminConfig(
  env: NodeJS.ProcessEnv = process.env,
): SeedAdminConfig {
  if (env.NODE_ENV === "production") {
    throw new Error("dev seed refuses to run in production");
  }

  const email = env[SEED_ADMIN_EMAIL_VAR]?.trim() ?? "";
  if (!email) {
    throw new Error(`${SEED_ADMIN_EMAIL_VAR} is required to seed the dev admin user`);
  }

  const password = env[SEED_ADMIN_PASSWORD_VAR] ?? "";
  if (!password) {
    throw new Error(`${SEED_ADMIN_PASSWORD_VAR} is required to seed the dev admin user`);
  }
  if (password.length < SEED_ADMIN_MIN_PASSWORD_LENGTH) {
    throw new Error(
      `${SEED_ADMIN_PASSWORD_VAR} must be at least ${SEED_ADMIN_MIN_PASSWORD_LENGTH} characters`,
    );
  }

  return { email, password };
}
