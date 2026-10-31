# BookNook API

Express 5 + MongoDB API for the BookNook library. Authentication stays in the Next.js frontend using Better Auth. This API accepts signed JWTs from that frontend's JWKS endpoint.

## Setup

Use Node.js 22.18+ or 24. MongoDB must support transactions: use MongoDB Atlas or a local replica set. The frontend and backend must share the same database name.

```sh
npm ci
cp .env.example .env
# Add your own MongoDB URI to .env.
npm run dev
```

Set `FRONTEND_URL` and `AUTH_ISSUER` to the frontend origin, e.g. `http://localhost:3000`. Set `AUTH_AUDIENCE` to the same value as the frontend's `AUTH_AUDIENCE`, e.g. `http://localhost:5000`. Use the exact same issuer value including its trailing-slash convention.

```sh
npm test
npm run seed
npm start
```

Seeding is optional and idempotent. It adds 66 catalog books (six curated samples and 60 sourced Open Library records) without overwriting existing copy counts. Community-owned sample books can be borrowed but cannot be edited by ordinary accounts. To own the samples, set `SEED_OWNER_ID`, `SEED_OWNER_NAME`, and `SEED_OWNER_EMAIL` to an actual Better Auth account before the first seed.

## Routes

| Method | Path | Access |
| --- | --- | --- |
| GET | `/books` | Public; `q`, `category`, `limit`, optional `page`; newest first |
| GET | `/books?mine=true` | Signed-in user's books |
| GET | `/books/:id` | Signed in |
| POST | `/books` | Signed in |
| PATCH | `/books/:id` | Book owner |
| DELETE | `/books/:id` | Book owner; no active borrows |
| POST | `/borrows` | Signed in; body `{ "bookId": "..." }` |
| GET | `/borrows` | Signed-in user's active borrows |
| DELETE | `/borrows/:id` | Borrow owner |

Book writes accept `title`, `author`, `category`, `description`, `image` (an uploaded image URL), and `totalCopies`. They never accept ownership or available-copy counts from the client. PATCH accepts a subset of these fields.

## Borrowing integrity

Borrow/return, total-copy changes, and deletion run in MongoDB transactions. Borrowing conditionally decrements stock only when a copy exists. A unique `(userId, bookId)` index prevents simultaneous duplicate borrows. Returning removes the active borrow and increments stock in the same transaction. Return dates are seven days from borrowing.

## Verification and limits

Eighteen tests cover validation, JWT identity/audience/expiry, ownership, duplicate borrowing, stock limits, transaction use, and deletion restrictions. Repository tests use fake collections; they do not replace integration tests against a real MongoDB replica set. Database connectivity, Google OAuth, imgbb uploads, and full live browser flows require credentials and have not yet been verified.

No credentials are committed. The backend has a local Git repository with eight feature-based commits. A GitHub remote has not yet been configured.

## Catalog and pagination

GET `/books?page=2&limit=12&category=Science&q=biology` returns `{ books, total, page, pageSize, totalPages }`. Filtering and pagination run in MongoDB; totals use the same filters. Omit `page` to keep the original array response, including the homepage request `/books?limit=6`. Pages beyond the last page return an empty books array and the matching total.

The checked-in seed snapshot includes 66 books with original published cover URLs. Imported metadata (title, primary author, first-publication year, source work and cover identifier) comes from Open Library. Imported descriptions are bibliographic notes; stock counts and dates added are demo inventory. Run `npm run seed` after configuring MongoDB to populate a live database. It uses stable seed keys and never overwrites existing inventory, loans, or edited records.

## Vercel deployment

The root `index.js` exports the Express application for Vercel. `src/app.js` remains a dependency-injected factory for tests, and `src/server.js` starts the local listener. The serverless entry initializes MongoDB on the first API request, reuses it for warm requests, and returns JSON 503 errors if initialization fails. `GET /` identifies the service without accessing the database; `GET /health` returns ready only after database connection and index creation succeed.

Production backend variables:

- `MONGODB_URI`: Atlas connection string.
- `MONGODB_DB`: same database name used by frontend authentication.
- `FRONTEND_URL` and `AUTH_ISSUER`: `https://booknook-frontend-eight.vercel.app` (without trailing slash).
- `AUTH_AUDIENCE`: `https://booknook-backend-seven.vercel.app` (same value on frontend).

Then set frontend `NEXT_PUBLIC_API_URL` to `https://booknook-backend-seven.vercel.app`, `BETTER_AUTH_URL` to the frontend origin, and enable `NEXT_PUBLIC_ENABLE_LIVE_API=true` only after the backend and catalog import are ready. Redeploy after updating environment variables.
