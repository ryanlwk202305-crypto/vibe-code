import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { all, initializeDatabase, one, run } from "./database.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");

app.use(cors());
app.use(express.json());

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${field} is required`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function nonNegativeNumber(value, field, integer = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    const error = new Error(`${field} must be a non-negative ${integer ? "integer" : "number"}`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

function requiredId(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error(`${field} must be a positive integer`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

function sendNotFound(res, entity) {
  return res.status(404).json({ error: `${entity} not found` });
}

function handle(handler) {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}

const productFields = (body) => ({
  pname: requiredText(body.pname, "pname"),
  description: typeof body.description === "string" ? body.description.trim() : "",
  price: nonNegativeNumber(body.price, "price"),
  qty: nonNegativeNumber(body.qty, "qty", true)
});

app.get("/api/get_products", handle(async (req, res) => {
  res.json(await all('SELECT pid, pname, description, price, qty FROM public."Product" ORDER BY pid DESC'));
}));

app.get("/api/get_product/:id", handle(async (req, res) => {
  const product = await one(
    'SELECT pid, pname, description, price, qty FROM public."Product" WHERE pid = $1',
    [requiredId(req.params.id, "id")]
  );
  return product ? res.json(product) : sendNotFound(res, "Product");
}));

app.post("/api/add_product", handle(async (req, res) => {
  const product = productFields(req.body);
  const created = await one(
    'INSERT INTO public."Product" (pname, description, price, qty) VALUES ($1, $2, $3, $4) RETURNING pid',
    [product.pname, product.description, product.price, product.qty]
  );
  res.status(201).json(await one(
    'SELECT pid, pname, description, price, qty FROM public."Product" WHERE pid = $1',
    [created.pid]
  ));
}));

app.put(["/api/update/:id", "/api/update_product/:id"], handle(async (req, res) => {
  const id = requiredId(req.params.id, "id");
  if (!await one('SELECT pid FROM public."Product" WHERE pid = $1', [id])) {
    return sendNotFound(res, "Product");
  }
  const product = productFields(req.body);
  await run(
    'UPDATE public."Product" SET pname = $1, description = $2, price = $3, qty = $4 WHERE pid = $5',
    [product.pname, product.description, product.price, product.qty, id]
  );
  res.json(await one(
    'SELECT pid, pname, description, price, qty FROM public."Product" WHERE pid = $1',
    [id]
  ));
}));

app.delete("/api/delete_product/:id", handle(async (req, res) => {
  const id = requiredId(req.params.id, "id");
  if (!await one('SELECT pid FROM public."Product" WHERE pid = $1', [id])) {
    return sendNotFound(res, "Product");
  }
  await run('DELETE FROM public."Product" WHERE pid = $1', [id]);
  res.status(204).end();
}));

app.get("/api/get_users", handle(async (req, res) => {
  res.json(await all('SELECT uid, uname, email FROM public."User" ORDER BY uid DESC'));
}));

app.get("/api/get_user/:id", handle(async (req, res) => {
  const user = await one(
    'SELECT uid, uname, email FROM public."User" WHERE uid = $1',
    [requiredId(req.params.id, "id")]
  );
  return user ? res.json(user) : sendNotFound(res, "User");
}));

app.post("/api/add_user", handle(async (req, res) => {
  const uname = requiredText(req.body.uname, "uname");
  const email = requiredText(req.body.email, "email");
  const password = requiredText(req.body.password, "password");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "email must be a valid email address" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await one(
    'INSERT INTO public."User" (uname, email, password) VALUES ($1, $2, $3) RETURNING uid',
    [uname, email, passwordHash]
  );
  res.status(201).json(await one('SELECT uid, uname, email FROM public."User" WHERE uid = $1', [created.uid]));
}));

app.put("/api/update_user/:id", handle(async (req, res) => {
  const id = requiredId(req.params.id, "id");
  const user = await one('SELECT uid FROM public."User" WHERE uid = $1', [id]);
  if (!user) {
    return sendNotFound(res, "User");
  }
  const uname = requiredText(req.body.uname, "uname");
  const email = requiredText(req.body.email, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "email must be a valid email address" });
  }
  if (req.body.password) {
    const passwordHash = await bcrypt.hash(requiredText(req.body.password, "password"), 10);
    await run('UPDATE public."User" SET uname = $1, email = $2, password = $3 WHERE uid = $4', [
      uname, email, passwordHash, id
    ]);
  } else {
    await run('UPDATE public."User" SET uname = $1, email = $2 WHERE uid = $3', [uname, email, id]);
  }
  res.json(await one('SELECT uid, uname, email FROM public."User" WHERE uid = $1', [id]));
}));

app.delete("/api/delete_user/:id", handle(async (req, res) => {
  const id = requiredId(req.params.id, "id");
  if (!await one('SELECT uid FROM public."User" WHERE uid = $1', [id])) {
    return sendNotFound(res, "User");
  }
  await run('DELETE FROM public."User" WHERE uid = $1', [id]);
  res.status(204).end();
}));

const orderQuery = `
  SELECT o.oid, o.uid, u.uname, o.pid, p.pname, o.order_date
  FROM public."Order" o
  JOIN public."User" u ON u.uid = o.uid
  JOIN public."Product" p ON p.pid = o.pid
`;

app.get("/api/get_orders/uid/:uid", handle(async (req, res) => {
  res.json(await all(`${orderQuery} WHERE o.uid = $1 ORDER BY o.oid DESC`, [
    requiredId(req.params.uid, "uid")
  ]));
}));

app.get("/api/get_orders/pid/:pid", handle(async (req, res) => {
  res.json(await all(`${orderQuery} WHERE o.pid = $1 ORDER BY o.oid DESC`, [
    requiredId(req.params.pid, "pid")
  ]));
}));

app.get("/api/get_orders", handle(async (req, res) => {
  res.json(await all(`${orderQuery} ORDER BY o.oid DESC`));
}));

app.get("/api/get_order/:id", handle(async (req, res) => {
  const order = await one(`${orderQuery} WHERE o.oid = $1`, [requiredId(req.params.id, "id")]);
  return order ? res.json(order) : sendNotFound(res, "Order");
}));

async function orderFields(body) {
  const uid = requiredId(body.uid, "uid");
  const pid = requiredId(body.pid, "pid");
  const orderDate = body.order_date ? requiredText(body.order_date, "order_date") : new Date().toISOString();
  if (!await one('SELECT uid FROM public."User" WHERE uid = $1', [uid])) {
    const error = new Error("uid does not reference an existing user");
    error.status = 400;
    throw error;
  }
  if (!await one('SELECT pid FROM public."Product" WHERE pid = $1', [pid])) {
    const error = new Error("pid does not reference an existing product");
    error.status = 400;
    throw error;
  }
  return { uid, pid, orderDate };
}

app.post("/api/add_order", handle(async (req, res) => {
  const order = await orderFields(req.body);
  const created = await one(
    'INSERT INTO public."Order" (uid, pid, order_date) VALUES ($1, $2, $3) RETURNING oid',
    [order.uid, order.pid, order.orderDate]
  );
  res.status(201).json(await one(`${orderQuery} WHERE o.oid = $1`, [created.oid]));
}));

app.put("/api/update_order/:id", handle(async (req, res) => {
  const id = requiredId(req.params.id, "id");
  if (!await one('SELECT oid FROM public."Order" WHERE oid = $1', [id])) {
    return sendNotFound(res, "Order");
  }
  const order = await orderFields(req.body);
  await run('UPDATE public."Order" SET uid = $1, pid = $2, order_date = $3 WHERE oid = $4', [
    order.uid, order.pid, order.orderDate, id
  ]);
  res.json(await one(`${orderQuery} WHERE o.oid = $1`, [id]));
}));

app.delete("/api/delete_order/:id", handle(async (req, res) => {
  const id = requiredId(req.params.id, "id");
  if (!await one('SELECT oid FROM public."Order" WHERE oid = $1', [id])) {
    return sendNotFound(res, "Order");
  }
  await run('DELETE FROM public."Order" WHERE oid = $1', [id]);
  res.status(204).end();
}));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.use(express.static(frontendDist));
app.get("*", (req, res, next) => {
  res.sendFile(path.join(frontendDist, "index.html"), (error) => {
    if (error) {
      if (error.code === "ENOENT") {
        return res.status(503).send("Frontend is not built. Run npm run build:frontend in the backend folder.");
      }
      return next(error);
    }
  });
});

app.use((error, req, res, next) => {
  if (
    error.code === "23503" ||
    error.code === "23505" ||
    error.code === "23514"
  ) {
    return res.status(409).json({ error: "A record with these values already exists or is referenced by an order" });
  }
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

initializeDatabase()
  .then(() => app.listen(port, () => {
    console.log(`CRUD API listening at http://localhost:${port}`);
  }))
  .catch((error) => {
    console.error("Failed to initialize the database", error);
    process.exitCode = 1;
  });
