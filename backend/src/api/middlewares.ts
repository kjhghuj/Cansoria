import { defineMiddlewares } from "@medusajs/medusa"
import cors from "cors"
import { productImageCleanupMiddleware } from "./middlewares/product-image-cleanup"
import { variantThumbnailProcessor } from "./middlewares/variant-thumbnail-processor"
import { authenticate } from "@medusajs/framework/http"
import { cartAccessGuard, paymentAccessGuard, disableOrderTransfer } from "../lib/resource-access"
import { createRateLimiter } from "../lib/rate-limit"
import { welcomePromotionGuard } from "../lib/welcome-promotions"
import { forceCartFields, forcePaymentFields } from "../lib/cart-fields"
import { forceCatalogFields, PROJECTED_STORE_RESOURCES } from "../lib/catalog-fields"
import { POST as retiredReturns } from "./store/returns/route"

const STORE_CORS = process.env.STORE_CORS || "http://localhost:3030"

const corsOptions = {
    origin: STORE_CORS.split(",").map(o => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-publishable-api-key", "x-medusa-access-token", "x-cart-access-token", "x-order-access-token"],
}

export default defineMiddlewares({
    routes: [
        ...PROJECTED_STORE_RESOURCES.map(resource => ({ matcher: `/store/${resource}`, middlewares: [forceCatalogFields] })),
        {
            matcher: "/store/returns", middlewares: [retiredReturns],
        },
        {
            matcher: "/store/carts",
            middlewares: [forceCartFields, authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true })],
        },
        {
            matcher: "/store/carts", method: "POST",
            middlewares: [createRateLimiter({ name: "cart-create", limit: 30, windowSeconds: 900 })],
        },
        {
            matcher: "/store/carts/:id",
            middlewares: [cartAccessGuard, createRateLimiter({ name: "cart-operations", limit: 120, windowSeconds: 900 }), welcomePromotionGuard],
        },
        {
            matcher: "/store/payment-collections",
            middlewares: [forcePaymentFields, authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }), paymentAccessGuard, createRateLimiter({ name: "payment", limit: 30, windowSeconds: 900 })],
        },
        {
            matcher: "/store/orders/:id/transfer",
            middlewares: [disableOrderTransfer],
        },
        {
            matcher: "/store/orders/:id",
            middlewares: [authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true })],
        },
        {
            matcher: "/store/orders/access", method: "POST",
            middlewares: [createRateLimiter({ name: "order-access", limit: 5, windowSeconds: 900 }), createRateLimiter({ name: "order-email-budget", limit: 500, windowSeconds: 86400, global: true })],
        },
        {
            matcher: "/store/orders/transfer", method: "POST",
            middlewares: [createRateLimiter({ name: "order-claim", limit: 10, windowSeconds: 900 })],
        },
        {
            matcher: "/store/newsletter", method: "POST",
            middlewares: [authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }), createRateLimiter({ name: "newsletter", limit: 10, windowSeconds: 3600 })],
        },
        {
            matcher: "/auth/*", method: "POST",
            middlewares: [createRateLimiter({ name: "authentication", limit: 20, windowSeconds: 900 })],
        },
        {
            matcher: "/store/customers", method: "POST",
            middlewares: [createRateLimiter({ name: "account-create", limit: 5, windowSeconds: 3600 }), createRateLimiter({ name: "welcome-email-budget", limit: 500, windowSeconds: 86400, global: true })],
        },
        {
            matcher: "/store/check-email", method: "POST",
            middlewares: [createRateLimiter({ name: "email-check", limit: 20, windowSeconds: 900 })],
        },
        {
            matcher: "/admin/products/:id",
            method: "POST",
            middlewares: [productImageCleanupMiddleware],
        },
        {
            matcher: "/store/products",
            method: "GET",
            middlewares: [variantThumbnailProcessor],
        },
        {
            matcher: "/store/products/:id",
            method: "GET",
            middlewares: [variantThumbnailProcessor],
        },
    ],
})
