# Atelier — guest e-commerce storefront

A responsive vanilla-JavaScript storefront with an Express/Mongoose REST API. Customers can browse, save a guest cart and wishlist, and check out without creating an account. There is no customer authentication.

## Requirements

- Node.js 20+
- MongoDB (a replica set is required for transactional checkout)

## Setup

1. In `server/`, run `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, `CLIENT_ORIGIN`, and a long random `ADMIN_SECRET`.
3. Start MongoDB as a replica set (required for transactional checkout). For a local database, start `mongod` with `--replSet rs0` and a data directory, then run `rs.initiate()` once in `mongosh`.
4. Run `npm run seed` from `server/` to create the catalog.
5. Run `npm run dev` from `server/` (API at `http://localhost:5000`).
6. In `client/`, run `npm start` (storefront at `http://localhost:5500`). Do not open HTML files as `file://`.

The commands can be run in separate terminals:

```powershell
Set-Location server
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```

```powershell
Set-Location client
npm start
```

The API permits only the configured `CLIENT_ORIGIN`. Change it in `.env` when using a different frontend origin. If Node.js cannot resolve Atlas SRV records on your network, optionally set `DNS_SERVERS` to comma-separated resolver IP addresses provided by your network administrator; leave it unset on networks where system DNS works normally.

## Admin

Admin write operations fail closed unless `ADMIN_SECRET` is configured on the server. Open `admin.html` and enter the secret into the in-page prompt; it is held in session storage only and sent over the configured API origin in the `x-admin-secret` header. Never put this value in client source, commit `.env`, or serve the admin API over plain HTTP outside local development. Rotate the secret if exposed. Admin operations are not customer authentication.

## Features

- MongoDB-backed product and category catalog, search, filters, sorting, and pagination.
- Product detail pages, quick product links, guest cart and wishlist persisted in local storage.
- Server-calculated order totals, stock checks, coupon validation, and transactional inventory reservation.
- Cash on Delivery checkout and high-entropy order tracking token. Tracking requires both the order number and token; only a hash of the token is stored.
- Reviews, newsletter signup, protected admin analytics, inventory, product/category management, and order status updates.

Configure MongoDB, the admin secret, the allowed frontend origin, and `API_BASE` in `client/js/config.js` before deployment. Replace the sample image URLs or product copy with assets you control before deployment. Payment gateway processing is not implemented; Cash on Delivery is the only active payment option.
