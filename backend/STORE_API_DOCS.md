# Cansoria Store API Docs

Base URL: `http://localhost:9030`

All Store API calls should include:

```http
x-publishable-api-key: YOUR_PUBLISHABLE_KEY
```

## Store Info

`GET /store/store-info`

Returns store name and metadata used by the storefront.

```json
{
  "store": {
    "id": "store_01...",
    "name": "Cansoria Studio",
    "metadata": {
      "brand": "Cansoria Studio",
      "support_email": "hello@cansoria.com"
    }
  }
}
```

## Products

### List Products

`GET /store/products`

The storefront requests categories, images, metadata, variants, options, inventory, and calculated prices.

### Product by Handle

`GET /store/products?handle=custom-portrait-from-photo`

Example product fields:

```json
{
  "products": [
    {
      "title": "Custom Portrait From Photo",
      "handle": "custom-portrait-from-photo",
      "categories": [{ "handle": "custom-portraits" }],
      "metadata": {
        "customizable": true,
        "free_preview": true,
        "rating": 4.9,
        "review_count": 214,
        "production_time": "2-3 weeks",
        "story_sections": []
      },
      "variants": [
        {
          "title": "8x10 / Canvas Only / Portrait",
          "options": {
            "Size": "8x10",
            "Framing": "Canvas Only",
            "Orientation": "Portrait"
          }
        }
      ]
    }
  ]
}
```

### Product Categories

`GET /store/product-categories`

Expected handles:

- `custom-portraits`
- `custom-painting`
- `pet-portraits`
- `wedding-gifts`
- `landscape`
- `abstract`
- `classic-art`
- `home-decor`
- `wall-art`

## Cart

### Create Cart

`POST /store/carts`

```json
{
  "region_id": "reg_01...",
  "sales_channel_id": "sc_01..."
}
```

### Get Cart

`GET /store/carts/:id`

The custom cart route returns item, product, promotion, shipping, payment collection, address, region, and total fields needed by cart and checkout pages.

### Line Items

- `POST /store/carts/:id/line-items`
- `POST /store/carts/:id/line-items/:line_id`
- `DELETE /store/carts/:id/line-items/:line_id`

### Promotions

- `POST /store/carts/:id/promotions`
- `DELETE /store/carts/:id/promotions`

Body:

```json
{
  "promo_codes": ["ART15-ABCD12"]
}
```

### Customer Ownership

`POST /store/carts/:id/customer`

Requires a customer bearer token.

## Shipping

- `GET /store/shipping-options?cart_id=:cartId`
- `POST /store/carts/:id/shipping-methods`

## Payment

Use the Medusa v2 payment collection flow:

1. `POST /store/payment-collections`
2. `POST /store/payment-collections/:id/payment-sessions`
3. `POST /store/carts/:id/complete`

Stripe provider ID: `pp_stripe_stripe`

## Customers and Orders

The storefront uses Medusa customer auth and store customer endpoints for:

- Customer login and registration
- Profile update
- Address CRUD
- Customer order list
- Order lookup
- Guest order transfer after account creation

## Newsletter

`POST /store/newsletter`

Body:

```json
{
  "email": "customer@example.com",
  "turnstile_token": "token"
}
```

Returns an `ART15-` welcome code when promotion creation succeeds.
