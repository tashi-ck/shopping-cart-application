# Novestra Shopping Cart

A full-stack e-commerce application built as part of the Novestra Full-Stack Upskilling Program. Supports product browsing, cart management, checkout with real payment processing via Stripe, order tracking, and a full admin panel for managing products, categories, orders, and users.

## Tech Stack

**Backend**
- .NET 8 Web API
- Clean Architecture (Core / Application / Infrastructure / API)
- Dapper (raw SQL, no ORM)
- PostgreSQL
- Auth0 (JWT validation, RBAC roles)
- Stripe Checkout + Webhooks
- AWS S3 (product image storage)
- xUnit + Moq + FluentAssertions (unit tests)

**Frontend**
- React (Vite)
- Tailwind CSS
- React Router
- Auth0 React SDK
- Axios
- Vitest + React Testing Library (unit tests)

## Features

**Storefront**
- Public product browsing — search, category filter, sort (unauthenticated)
- Product detail pages
- Auth0 login/logout (email/password + social login)
- Shopping cart — add, update quantity, remove, live stock validation
- Checkout via Stripe Checkout (hosted payment page)
- Buy Now — single-product purchase bypassing the cart entirely
- Order history and order detail views
- Order cancellation (Pending orders only — restores stock)

**Admin panel** *(role-gated via Auth0 custom claims)*
- Dashboard with catalog stats and low-stock alerts
- Product CRUD, including image upload
- Product deactivation (hide from storefront without breaking order history)
- Category CRUD
- View and manage all orders across all customers
- Update order status (Pending → Confirmed → Shipped → Delivered → Cancelled)
- Delete orders (permanent, admin-only — distinct from customer cancellation)
- View all users, deactivate/reactivate accounts, delete accounts

**Payments**
- Stripe Checkout (test mode) for both cart checkout and Buy Now
- Server-side payment confirmation on redirect
- Stripe webhook (`checkout.session.completed`) as a reliability backstop — orders are created even if the customer's browser never makes it back to the app after paying
- Idempotent order creation — safe against the redirect-confirm and webhook both firing for the same payment

## Project Structure

```
ShoppingCart_Backend/
   ShoppingCart.API/              — Controllers, Program.cs, app configuration
   ShoppingCart.Application/      — DTOs, service interfaces, business logic
   ShoppingCart.Infrastructure/   — Dapper repositories, Stripe integration
   ShoppingCart.Core/             — Domain entities
   ShoppingCart.UnitTests/        — xUnit backend tests
ShoppingCart_Frontend/            — React frontend
```

## Getting Started

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- PostgreSQL running locally
- An Auth0 account (free tier)
- A Stripe account in test mode
- Stripe CLI (for local webhook testing)

### Database Setup

1. Create a PostgreSQL database, e.g. `shopping_cart`.
2. Run the schema script (raw SQL — this project uses Dapper, not EF Core migrations):
   ```bash
   psql -U postgres -d shopping_cart -f db/schema.sql
   ```

### Auth0 Setup

1. Create an Auth0 tenant.
2. Create a **Single Page Application** for the frontend — set Allowed Callback/Logout/Web Origin URLs to `http://localhost:5173`.
3. Create an **API** for the backend — note its Identifier (this is your audience).
4. Under the SPA's **API Access** (or **Machine to Machine Applications**) tab, authorize it for your API.
5. Create an **Admin** role under User Management → Roles, and assign it to your own test user.
6. Add a Post-Login Action that injects `email`, `given_name`, `family_name`, and `roles` as namespaced custom claims into the access token.

### Stripe Setup

1. Get your test-mode Secret Key and set it in the backend config.
2. Install the Stripe CLI and run `stripe login`.
3. For local webhook testing, run:
   ```bash
   stripe listen --forward-to https://localhost:7135/api/payments/webhook
   ```
4. Copy the printed `whsec_...` value into your backend config.

### Backend Setup

1. Restore packages:
   ```bash
   dotnet restore
   ```
2. Configure `ShoppingCart.API/appsettings.json` (or `appsettings.Development.json`):
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=shopping_cart;Username=postgres;Password=YOUR_PASSWORD"
     },
     "Auth0": {
       "Domain": "your-tenant.us.auth0.com",
       "Audience": "https://your-api-identifier"
     },
     "Stripe": {
       "SecretKey": "sk_test_...",
       "WebhookSecret": "whsec_..."
     },
     "Frontend": {
       "BaseUrl": "http://localhost:5173"
     }
   }
   ```
3. Create an empty 'wwwroot' folder (required by ASP.NET Core's static web assets
   loader, even though this project no longer serves files from it — images are
   stored in S3):
   ```bash
      mkdir ShoppingCart.API/wwwroot
   ```
4. Run the API:
   ```bash
   dotnet run --project ShoppingCart.API
   ```

### Frontend Setup

1. Navigate to the frontend folder and install:
   ```bash
   cd ShoppingCart_Frontend
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your own values:
   ```
   VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   VITE_AUTH0_AUDIENCE=https://your-api-identifier
   VITE_API_BASE_URL=https://localhost:7135/api
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Running Tests

**Backend**
```bash
dotnet test
```

**Frontend**
```bash
cd ShoppingCart_Frontend
npm run test
```

## Testing Payments

Use Stripe's test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code. No real charges occur in test mode.

## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | — | Browse products (filter by `categoryId`, `search`, `sortBy`) |
| GET | `/api/categories` | — | List categories |
| POST/PUT/DELETE | `/api/products`, `/api/categories` | Admin | Manage catalog |
| PATCH | `/api/products/{id}/active` | Admin | Deactivate/reactivate a product |
| GET/POST/PUT/DELETE | `/api/cart`, `/api/cart/items/{id}` | User | Manage cart |
| POST | `/api/payments/create-checkout-session` | User | Start Stripe Checkout for cart |
| POST | `/api/payments/create-buynow-checkout-session` | User | Start Stripe Checkout for Buy Now |
| GET | `/api/payments/confirm/{sessionId}` | User | Confirm payment, create order |
| POST | `/api/payments/webhook` | — (Stripe signature) | Stripe event delivery |
| GET | `/api/orders` | User | Own order history |
| POST | `/api/orders/{id}/cancel` | User | Cancel a Pending order (restores stock) |
| GET | `/api/orders/admin` | Admin | All orders, all customers |
| PUT | `/api/orders/admin/{id}/status` | Admin | Update order status |
| DELETE | `/api/orders/admin/{id}` | Admin | Permanently delete an order |
| GET | `/api/users/admin` | Admin | List all users |
| PATCH | `/api/users/admin/{id}/active` | Admin | Deactivate/reactivate a user |
| DELETE | `/api/users/admin/{id}` | Admin | Delete a user |

## Architecture Notes

- **Clean Architecture**: `Core` has no dependencies; `Application` holds business logic behind interfaces; `Infrastructure` implements those interfaces with Dapper/Stripe; `API` wires it together via DI.
- **Dapper over EF Core**: no automatic change tracking or migrations — schema changes are hand-written SQL, and repositories write explicit queries. Checkout and order cancellation use manual database transactions with row-level locking (`FOR UPDATE`) to prevent overselling stock under concurrent requests.
- **Cart vs. Order**: `CartItems` and `OrderItems` have no direct relationship — checkout copies cart contents into a new, permanent `OrderItems` snapshot (including price at time of purchase) and only then clears the cart. This means product price changes never retroactively affect past orders.
- **Soft-delete for Products**: products referenced by existing orders can't be hard-deleted (a foreign key constraint prevents it) — they're deactivated instead, hiding them from the storefront while preserving order history integrity.
- **Payment reliability**: order creation from a successful payment can be triggered by two independent paths (the customer's browser redirect, or Stripe's webhook) — a unique constraint on the payment reference plus an idempotency check ensures this never creates duplicate orders.