import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import path from "path"
import fs from "fs"
import { signingSecret, storefrontUrl } from "./src/lib/access-tokens"
import { STORE_RESTRICTED_FIELDS } from "./src/lib/catalog-fields"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const backendUrl = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9030").replace(/\/$/, "")
const hasS3FileConfig = Boolean(
  process.env.S3_FILE_URL &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET
)

if (process.env.NODE_ENV === "production" && !hasS3FileConfig) {
  throw new Error("SECURITY ERROR: S3 file storage must be configured in production.")
}
if (process.env.NODE_ENV === "production") {
  signingSecret()
  storefrontUrl()
  const cookieSecret = process.env.COOKIE_SECRET || ""
  if (cookieSecret.length < 32 || /supersecret|replace|changeme|your[_-]|example/i.test(cookieSecret)) throw new Error("SECURITY ERROR: A strong COOKIE_SECRET is required")
  if (!process.env.REDIS_URL) throw new Error("SECURITY ERROR: REDIS_URL is required for shared rate limits and locks")
  if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) throw new Error("SECURITY ERROR: STRIPE_WEBHOOK_SECRET is required")
  const legacyStatic = path.join(process.cwd(), "static")
  // The framework serves /static before custom routes; production must have no residual files there.
  if (fs.existsSync(legacyStatic) && fs.readdirSync(legacyStatic).length) throw new Error("SECURITY ERROR: Move residual static files to controlled storage before production")
  for (const key of ["STORE_CORS", "ADMIN_CORS", "AUTH_CORS"]) {
    const origins = (process.env[key] || "").split(",").map(value => value.trim()).filter(Boolean)
    if (!origins.length || origins.some(origin => { try { const url = new URL(origin); return url.protocol !== "https:" || url.origin !== origin || origin.includes("*") } catch { return true } })) throw new Error(`SECURITY ERROR: ${key} must contain exact HTTPS origins`)
  }
}

const fileProvider = hasS3FileConfig
  ? {
      resolve: "@medusajs/medusa/file-s3",
      id: "s3",
      options: {
        file_url: process.env.S3_FILE_URL,
        access_key_id: process.env.S3_ACCESS_KEY_ID,
        secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
        region: process.env.S3_REGION || "auto",
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
      },
    }
  : {
      resolve: "@medusajs/medusa/file-local",
      id: "localfs",
      options: {
        upload_dir: path.join(process.cwd(), "public-uploads"),
        private_upload_dir: path.join(process.cwd(), "private-uploads"),
        backend_url: `${backendUrl}/static`,
      },
    }

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      restrictedFields: { store: STORE_RESTRICTED_FIELDS },
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/locking",
      options: process.env.REDIS_URL ? { providers: [{ resolve: "@medusajs/medusa/locking-redis", id: "redis", is_default: true, options: { redisUrl: process.env.REDIS_URL } }] } : {},
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [fileProvider],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              channels: ["email"],
              apiKey: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
  ],
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9030",
  },
})

const jwtSecret = process.env.JWT_SECRET || "supersecret"
const cookieSecret = process.env.COOKIE_SECRET || "supersecret"
const resendApiKey = process.env.RESEND_API_KEY
const stripeApiKey = process.env.STRIPE_API_KEY

if (process.env.NODE_ENV === "production") {
  if (jwtSecret === "supersecret" || cookieSecret === "supersecret") {
    throw new Error("SECURITY ERROR: JWT_SECRET and COOKIE_SECRET must be set to secure values in production and cannot be 'supersecret'.")
  }

  if (!resendApiKey || resendApiKey === "your_resend_api_key_here") {
    console.warn("WARNING: RESEND_API_KEY is not configured. Email notifications will fail.")
  }
} else {
  if (jwtSecret === "supersecret" || cookieSecret === "supersecret") {
    console.warn("SECURITY WARNING: Using default insecure secrets. Ensure JWT_SECRET and COOKIE_SECRET are set to secure random values in production.")
  }

  if (!resendApiKey || resendApiKey === "your_resend_api_key_here") {
    console.warn("INFO: RESEND_API_KEY is not configured. Email notifications will not work.")
  }

  if (!stripeApiKey || stripeApiKey === "your_stripe_secret_key") {
    console.warn("INFO: STRIPE_API_KEY is not configured. Stripe payments will not work.")
  }
}
