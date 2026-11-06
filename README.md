# Storefront CRUD

A React and Material UI admin frontend backed by an Express API and Supabase PostgreSQL.

## Build and run from one server

Install dependencies and build the frontend. You only need to install each project's dependencies once:

```powershell
cd C:\crud_test\frontend
npm.cmd install
cd ..\backend
npm.cmd install
npm.cmd run build:frontend
```

In Supabase, open **Project Settings → Database → Connection string**, choose the **URI** format, and copy the PostgreSQL connection string. Put it in `backend\.env` as `DATABASE_URL=...`. Keep this file private; never put the database password in frontend code or commit `.env`.

For strict TLS certificate verification, download the database CA certificate from your Supabase project's database connection settings, save it under `backend\certs`, and add `SUPABASE_DB_CA_CERT=certs\your-ca-file.crt` to `backend\.env`. Without this optional certificate setting, the connection is encrypted but the server certificate is not verified.

Start the backend, which now serves both the API and the built React app:

```powershell
cd C:\crud_test\backend
npm.cmd start
```

On first start, the backend creates the required Supabase tables if they do not already exist. Open **http://localhost:4000** in your browser. The API is available at the same origin under `/api` (for example, `http://localhost:4000/api/get_products`).

The backend uses the PostgreSQL connection string from `backend\.env`. The previous local SQLite database is not copied to Supabase automatically; its data remains in `backend\data\store.sqlite`.

Whenever you change the frontend source, rebuild it before restarting or refreshing the app:

```powershell
cd C:\crud_test\backend
npm.cmd run build:frontend
```

For frontend development with Vite hot reload, run `npm.cmd run dev` in `frontend` and `npm.cmd run dev` in `backend` in separate terminals instead.

## Data model

- `Product(pid, pname, description, price, qty)`
- `User(uid, uname, email, password)` — passwords are stored as bcrypt hashes and never returned by API reads.
- `Order(oid, uid, pid, order_date)` — `uid` references `User.uid` and `pid` references `Product.pid`. Deletes are restricted while an order references the user or product.

## API

Products: `GET /api/get_products`, `GET /api/get_product/:id`, `POST /api/add_product`, `PUT /api/update/:id` (also `PUT /api/update_product/:id`), `DELETE /api/delete_product/:id`.

Users: `GET /api/get_users`, `GET /api/get_user/:id`, `POST /api/add_user`, `PUT /api/update_user/:id`, `DELETE /api/delete_user/:id`.

Orders: `GET /api/get_orders`, `GET /api/get_order/:id`, `GET /api/get_orders/uid/:uid`, `GET /api/get_orders/pid/:pid`, `POST /api/add_order`, `PUT /api/update_order/:id`, `DELETE /api/delete_order/:id`.

The original request assigns `/api/update/:id` to both products and users. Since one URL cannot unambiguously update two entity types, that route updates products and the user endpoint is `/api/update_user/:id`.
