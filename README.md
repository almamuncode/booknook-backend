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

Seeding is optional and idempotent. It adds six sample books without overwriting existing copy counts. Community-owned sample books can be borrowed but cannot be edited by ordinary accounts. To own the samples, set `SEED_OWNER_ID`, `SEED_OWNER_NAME`, and `SEED_OWNER_EMAIL` to an actual Better Auth account before the first seed.

## Routes

| Method | Path | Access |
| --- | --- | --- |
| GET | `/books` | Public; `q`, `category`, `limit`; newest first |
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

Fifteen tests cover validation, JWT identity/audience/expiry, ownership, duplicate borrowing, stock limits, transaction use, and deletion restrictions. Repository tests use fake collections; they do not replace integration tests against a real MongoDB replica set. Database connectivity, Google OAuth, imgbb uploads, and full live browser flows require credentials and have not yet been verified.

No credentials are committed. The backend has a local Git repository with eight feature-based commits. A GitHub remote has not yet been configured.
