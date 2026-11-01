import { readSeedAdminConfig } from "../../scripts/lorencess-seed-config"

describe("LORENCESS dev seed configuration", () => {
  const valid = {
    LORENCESS_SEED_ADMIN_EMAIL: "owner@example.dev",
    LORENCESS_SEED_ADMIN_PASSWORD: "a-strong-dev-password",
  }

  it("returns the credentials when both variables are provided", () => {
    expect(readSeedAdminConfig({ ...valid } as NodeJS.ProcessEnv)).toEqual({
      email: "owner@example.dev",
      password: "a-strong-dev-password",
    })
  })

  it("refuses to run in production", () => {
    expect(() =>
      readSeedAdminConfig({ ...valid, NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toThrow("dev seed refuses to run in production")
  })

  it("names the missing variable instead of the password", () => {
    expect(() => readSeedAdminConfig({ LORENCESS_SEED_ADMIN_PASSWORD: "a-strong-dev-password" } as NodeJS.ProcessEnv)).toThrow(
      "LORENCESS_SEED_ADMIN_EMAIL is required",
    )
    expect(() => readSeedAdminConfig({ LORENCESS_SEED_ADMIN_EMAIL: "owner@example.dev" } as NodeJS.ProcessEnv)).toThrow(
      "LORENCESS_SEED_ADMIN_PASSWORD is required",
    )
  })

  it("rejects passwords shorter than 12 characters without echoing them", () => {
    try {
      readSeedAdminConfig({ ...valid, LORENCESS_SEED_ADMIN_PASSWORD: "short" } as NodeJS.ProcessEnv)
      throw new Error("expected readSeedAdminConfig to throw")
    } catch (error) {
      expect((error as Error).message).toContain("at least 12 characters")
      expect((error as Error).message).not.toContain("short")
    }
  })

  it("allows development and unset NODE_ENV", () => {
    expect(() => readSeedAdminConfig({ ...valid, NODE_ENV: "development" } as NodeJS.ProcessEnv)).not.toThrow()
    expect(() => readSeedAdminConfig(valid as NodeJS.ProcessEnv)).not.toThrow()
  })
})
