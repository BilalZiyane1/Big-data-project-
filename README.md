# FashionHub MERN E-commerce

Production-oriented clothing e-commerce platform using MongoDB, Express.js, React.js, and Node.js.

## 1) Architecture Overview

### High-level layers

- Frontend layer (React + Tailwind): customer shop, auth flows, cart, checkout, profile, admin dashboard.
- Backend layer (Express MVC): REST API, auth, validation, role-based authorization, business logic.
- Database layer (MongoDB + Mongoose): users, products, reviews, carts, orders with references and timestamps.

### Project structure

```text
bigData/
  backend/
    src/
      app.js
      server.js
      config/
        db.js
        cloudinary.js
      controllers/
        authController.js
        userController.js
        productController.js
        cartController.js
        orderController.js
        adminController.js
        uploadController.js
      middleware/
        authMiddleware.js
        validateRequest.js
        errorMiddleware.js
      models/
        User.js
        Product.js
        Review.js
        Cart.js
        Order.js
      routes/
        authRoutes.js
        userRoutes.js
        productRoutes.js
        cartRoutes.js
        orderRoutes.js
        adminRoutes.js
        uploadRoutes.js
      utils/
        asyncHandler.js
        AppError.js
        generateToken.js
        pagination.js
      validators/
        authValidators.js
        productValidators.js
        cartValidators.js
        orderValidators.js
      scripts/
        seedAdmin.js
    package.json
    .env.example

  frontend/
    src/
      App.jsx
      main.jsx
      api/
        axiosClient.js
        authApi.js
        userApi.js
        productApi.js
        cartApi.js
        orderApi.js
        adminApi.js
        uploadApi.js
      context/
        AuthContext.jsx
        CartContext.jsx
      hooks/
        useAuth.js
        useCart.js
        useDebounce.js
      components/
        common/
          Loader.jsx
          Modal.jsx
          Pagination.jsx
          ProtectedRoute.jsx
          AdminRoute.jsx
        layout/
          Navbar.jsx
          Footer.jsx
        product/
          ProductCard.jsx
      pages/
        auth/
          LoginPage.jsx
          RegisterPage.jsx
        shop/
          HomePage.jsx
          ProductsPage.jsx
          ProductDetailsPage.jsx
          CartPage.jsx
          CheckoutPage.jsx
          ProfilePage.jsx
        admin/
          AdminDashboardPage.jsx
      styles/
        index.css
      utils/
        formatters.js
    package.json
    .env.example

  package.json
  .gitignore
  README.md
```

## 2) Backend Features Implemented

- JWT authentication (register/login/me) with bcrypt password hashing.
- Role-based authorization middleware (admin/customer).
- Product CRUD for admins.
- Product browsing with filtering, search, sort, pagination.
- Reviews and ratings with aggregate recalculation.
- Wishlist management per user.
- Cart API with quantity/variant support and persistence.
- Checkout/order creation (mock payment and Stripe-ready mode).
- Order tracking (my orders, order details, admin all orders).
- Admin management:
  - Dashboard stats (sales, users, orders, products).
  - User role updates.
  - Order status updates.
- Image upload endpoint with Cloudinary integration.
- Security middleware:
  - helmet, cors, hpp, mongo sanitize, xss clean, rate limiting.
- Input validation via express-validator.
- Centralized error handling.

## 3) Frontend Features Implemented

- Responsive React app with Tailwind CSS.
- Lazy-loaded routes/pages using React.lazy + Suspense.
- Pages:
  - Home
  - Product listing
  - Product details
  - Cart
  - Checkout
  - Login/Register
  - User profile
  - Admin dashboard
- Reusable components:
  - Navbar
  - Footer
  - ProductCard
  - Loader
  - Modal
  - Pagination
- Context-based state management:
  - AuthContext for auth/session/role
  - CartContext for cart persistence and API sync
- Axios API layer with token interceptor.

## 4) Database Design

### User

- name, email, password (hashed), role
- avatar
- wishlist (Product references)
- addresses
- timestamps

### Product

- name, description, price, category
- sizes, colors, images
- stockQuantity
- averageRating, ratingsCount
- createdBy (User ref)
- timestamps

### Review

- product (Product ref)
- user (User ref)
- rating, comment
- unique index: (user, product)
- timestamps

### Cart

- user (User ref, unique)
- items[] with product ref + snapshots (name/price/image) + size/color/quantity
- subtotal, itemCount
- timestamps

### Order

- user (User ref)
- items[] with product ref + snapshots
- shippingAddress
- payment info
- totals: subtotal, shippingFee, tax, total
- status lifecycle: pending/paid/shipped/delivered/cancelled
- timestamps

## 5) API Endpoint Summary

### Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

### Products

- GET /api/products
- GET /api/products/featured
- GET /api/products/:id
- POST /api/products (admin)
- PUT /api/products/:id (admin)
- DELETE /api/products/:id (admin)
- POST /api/products/:id/reviews (auth)

### Cart

- GET /api/cart
- POST /api/cart/items
- PUT /api/cart/items/:productId
- DELETE /api/cart/items/:productId
- DELETE /api/cart

### Orders

- POST /api/orders
- POST /api/orders/payment-intent
- GET /api/orders/my
- GET /api/orders/:id
- GET /api/orders/admin/all (admin)
- PUT /api/orders/admin/:id/status (admin)

### Users/Admin/Upload

- GET /api/users/me
- PUT /api/users/me
- GET /api/users/wishlist
- POST /api/users/wishlist/:productId
- DELETE /api/users/wishlist/:productId
- GET /api/admin/stats (admin)
- GET /api/admin/users (admin)
- PUT /api/admin/users/:id/role (admin)
- POST /api/upload/image (admin)

## 6) Local Setup

## Prerequisites

- Node.js 18+
- MongoDB local instance or cloud MongoDB URI

## Installation

```bash
# from project root
npm install
npm --prefix backend install
npm --prefix frontend install
```

## Environment setup

1. Copy backend env template:

```bash
cp backend/.env.example backend/.env
```

2. Copy frontend env template:

```bash
cp frontend/.env.example frontend/.env
```

3. Fill in required values in backend/.env:

- MONGO_URI
- JWT_SECRET
- CLIENT_URL
- optional Cloudinary keys
- optional Stripe key

## Run development servers

```bash
# root command (runs both backend and frontend)
npm run dev
```

Or separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## Optional: seed admin user

```bash
npm --prefix backend run seed:admin
```

## 7) Production Notes

- Move JWT into secure HttpOnly cookies for production web deployments.
- Add API docs (OpenAPI/Swagger).
- Add automated tests (unit + integration + e2e).
- Add CI/CD pipeline with build, test, lint, and security scan.
- Add Redis for caching sessions, products, and rate-limit store.
- Add queue workers for email, stock sync, and asynchronous tasks.
- Split services by bounded context at higher traffic scale.
- Add observability (structured logs, tracing, metrics, alerting).

## 8) Current Tradeoffs

- Stripe intent is backend-ready but frontend uses a simplified flow.
- Tailwind at-rule warnings may appear in editors without Tailwind CSS tooling; build still works via PostCSS setup.
- No test suite is included yet; recommended as first extension.

## 9) Observability and Logging

This project now includes a structured logging stack designed for high-volume analytics and downstream big data processing.

### Backend logging coverage

- Request lifecycle logging for all API calls:
  - Correlation ID (`x-request-id`) generated or propagated.
  - Request metadata: method, path, route, params, query, user agent, anonymized IP.
  - Response metadata: status code, payload size, latency, slow-request flag.
- Centralized error logging:
  - Sanitized request context and error details.
  - Operational vs non-operational classification support.
- Business/audit events:
  - Authentication lifecycle (register/login/logout/session refresh).
  - Product lifecycle (create/update/delete/review).
  - Cart lifecycle (add/update/remove/clear).
  - Order/payment lifecycle (order created, payment intent, status updates).
  - Profile/wishlist/admin role and dashboard events.
  - Upload/media events.
- Runtime/system logging:
  - Startup and HTTP readiness events.
  - Periodic process metrics snapshots (memory, uptime, load average).
  - Node warnings, unhandled rejections, shutdown signals.
- Durable hierarchical file sinks (day/hour buckets):
  - `backend/logs/YYYY-MM-DD/HH/app.ndjson` for all structured events.
  - `backend/logs/YYYY-MM-DD/HH/error.ndjson` for warn/error/fatal events.
  - Time-bucketed partitioning that is directly queryable by date/hour for analytics and incident response.
- Optional MongoDB query logging:
  - Enabled with `LOG_MONGOOSE_DEBUG=true`.

### Frontend telemetry coverage

- Page navigation events.
- User interactions:
  - Clicks on key actionable elements.
  - Form submissions.
- API client observability:
  - Outgoing request metadata.
  - Response/error status and latency.
- Browser runtime events:
  - JavaScript errors.
  - Unhandled promise rejections.
  - Initial navigation performance metrics.
- Non-blocking batched transport to backend (`/api/logs/client`) with fallback delivery on page hide.

### Data safety and performance controls

- Sensitive data redaction for known secret/token/password fields.
- Email hashing and IP anonymization before persistence.
- Recursive sanitization with configurable depth and payload truncation.
- Bounded event queues and batch sizes to avoid client memory pressure.
- Structured JSON logs suitable for ingestion by ELK, OpenSearch, Splunk, BigQuery, Databricks, or Spark pipelines.

### Log schema (high level)

All events are emitted as JSON with a normalized shape and event-specific payload sections.

- Core fields:
  - `time`
  - `level`
  - `service`
  - `environment`
  - `event`
  - `requestId`
- Actor context:
  - `actor.id`
  - `actor.role`
- Context blocks by event type:
  - `request.*`
  - `response.*`
  - `performance.*`
  - `error.*`
  - `details.*`
  - `metrics.*`
  - `telemetry.*`

### Recommended downstream partitioning keys

- Date (`time` truncated to day/hour).
- Event name (`event`).
- Severity (`level`).
- Environment (`environment`).
- Route (`request.route`) for API events.

### Recommended ingestion pattern for big data

- Treat all `app.ndjson` files under `backend/logs/YYYY-MM-DD/HH/` as the canonical append-only event stream.
- Use matching `error.ndjson` files for low-latency alerting and incident timelines.
- Partition by `time` (hour/day), then cluster/index by `event` and `requestId`.
- Preserve raw JSON shape to keep schema evolution flexible during experimentation.

### Environment variables

See:

- `backend/.env.example`
- `frontend/.env.example`

for all logging and telemetry tuning controls.
