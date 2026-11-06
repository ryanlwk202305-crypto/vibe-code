import { useCallback, useEffect, useState } from "react";
import {
  Alert, AppBar, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Paper, Snackbar, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Toolbar,
  Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

const resources = {
  products: {
    label: "Products",
    singular: "Product",
    icon: Inventory2OutlinedIcon,
    list: "/api/get_products",
    create: "/api/add_product",
    update: (id) => `/api/update/${id}`,
    remove: (id) => `/api/delete_product/${id}`,
    idField: "pid",
    fields: [
      { name: "pname", label: "Product name", required: true },
      { name: "description", label: "Description", multiline: true },
      { name: "price", label: "Price", type: "number", required: true, min: 0, step: "0.01" },
      { name: "qty", label: "Quantity", type: "number", required: true, min: 0, step: "1" }
    ],
    columns: [
      { key: "pname", label: "Product" },
      { key: "description", label: "Description" },
      { key: "price", label: "Price", format: (value) => `$${Number(value).toFixed(2)}` },
      { key: "qty", label: "In stock" }
    ]
  },
  users: {
    label: "Users",
    singular: "User",
    icon: PeopleAltOutlinedIcon,
    list: "/api/get_users",
    create: "/api/add_user",
    update: (id) => `/api/update_user/${id}`,
    remove: (id) => `/api/delete_user/${id}`,
    idField: "uid",
    fields: [
      { name: "uname", label: "Full name", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "password", label: "Password", type: "password", required: true, editOptional: true }
    ],
    columns: [
      { key: "uname", label: "Name" },
      { key: "email", label: "Email" }
    ]
  },
  orders: {
    label: "Orders",
    singular: "Order",
    icon: ReceiptLongOutlinedIcon,
    list: "/api/get_orders",
    create: "/api/add_order",
    update: (id) => `/api/update_order/${id}`,
    remove: (id) => `/api/delete_order/${id}`,
    idField: "oid",
    fields: [
      { name: "uid", label: "Customer", kind: "user", required: true },
      { name: "pid", label: "Product", kind: "product", required: true },
      { name: "order_date", label: "Order date", type: "datetime-local", required: true }
    ],
    columns: [
      { key: "oid", label: "Order" },
      { key: "uname", label: "Customer" },
      { key: "pname", label: "Product" },
      { key: "order_date", label: "Order date", format: (value) => new Date(value).toLocaleString() }
    ]
  }
};

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

function initialValues(resource, row) {
  const values = {};
  resource.fields.forEach(({ name, kind }) => {
    let value = row?.[name] ?? "";
    if (name === "password") value = "";
    if (kind && value !== "") value = String(value);
    if (name === "order_date" && value) value = new Date(value).toISOString().slice(0, 16);
    values[name] = value;
  });
  if (!row && resource === resources.orders) {
    values.order_date = new Date().toISOString().slice(0, 16);
  }
  return values;
}

function ResourceDialog({ resource, row, options, open, onClose, onSave }) {
  const [values, setValues] = useState(() => initialValues(resource, row));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(initialValues(resource, row));
  }, [resource, row, open]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...values };
      if (resource === resources.users && row && !payload.password) delete payload.password;
      if (resource === resources.orders && payload.order_date) {
        payload.order_date = new Date(payload.order_date).toISOString();
      }
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{row ? `Edit ${resource.singular}` : `Add ${resource.singular}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.2} sx={{ pt: 1 }}>
            {resource.fields.map((field) => {
              const isOptionalPassword = field.editOptional && row;
              const common = {
                key: field.name,
                fullWidth: true,
                label: isOptionalPassword ? "New password (leave blank to keep current)" : field.label,
                type: field.type === "datetime-local" ? undefined : field.type || "text",
                required: field.required && !isOptionalPassword,
                value: values[field.name] ?? "",
                onChange: (event) => setValues((current) => ({
                  ...current,
                  [field.name]: event.target.value
                })),
                multiline: field.multiline,
                min: field.min,
                step: field.step,
                InputLabelProps: field.type === "datetime-local" ? { shrink: true } : undefined
              };

              if (field.kind === "user" || field.kind === "product") {
                const list = field.kind === "user" ? options.users : options.products;
                const id = field.kind === "user" ? "uid" : "pid";
                const title = field.kind === "user" ? "uname" : "pname";
                return (
                  <TextField {...common} select key={field.name} disabled={!list.length}>
                    {list.map((item) => (
                      <MenuItem key={item[id]} value={String(item[id])}>
                        {item[title]} (#{item[id]})
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }
              return (
                <TextField
                  {...common}
                  key={field.name}
                  type={field.type === "datetime-local" ? field.type : common.type}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving..." : row ? "Save changes" : "Create"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function App() {
  const [active, setActive] = useState("products");
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ users: [], products: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, row: null });
  const [notice, setNotice] = useState({ open: false, message: "", severity: "success" });
  const resource = resources[active];
  const Icon = resource.icon;

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await request(resource.list));
    } catch (error) {
      setNotice({ open: true, message: error.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [resource]);

  const loadOptions = useCallback(async () => {
    try {
      const [users, products, orders] = await Promise.all([
        request(resources.users.list),
        request(resources.products.list),
        request(resources.orders.list)
      ]);
      setOptions({ users, products, orders });
    } catch (error) {
      setNotice({ open: true, message: error.message, severity: "error" });
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const save = async (payload) => {
    const row = dialog.row;
    const path = row ? resource.update(row[resource.idField]) : resource.create;
    await request(path, {
      method: row ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    setDialog({ open: false, row: null });
    setNotice({
      open: true,
      message: `${resource.singular} ${row ? "updated" : "created"} successfully`,
      severity: "success"
    });
    await Promise.all([loadRows(), loadOptions()]);
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${resource.singular.toLowerCase()}?`)) return;
    try {
      await request(resource.remove(row[resource.idField]), { method: "DELETE" });
      setNotice({ open: true, message: `${resource.singular} deleted`, severity: "success" });
      await Promise.all([loadRows(), loadOptions()]);
    } catch (error) {
      setNotice({ open: true, message: error.message, severity: "error" });
    }
  };

  return (
    <Box className="app-shell">
      <AppBar position="static" color="transparent" elevation={0} className="topbar">
        <Toolbar disableGutters className="topbar-content">
          <Stack direction="row" spacing={1.3} alignItems="center">
            <Box className="brand-mark"><StorefrontRoundedIcon /></Box>
            <Typography variant="h6" fontWeight={750}>Storefront</Typography>
            <Chip size="small" label="ADMIN" className="admin-chip" />
          </Stack>
          <Typography variant="body2" color="text.secondary">Management console</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" className="page-content">
        <Box className="page-heading">
          <Box>
            <Typography variant="h4" fontWeight={750} letterSpacing="-0.04em">
              Good to see you
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.7 }}>
              Manage your catalog, customers, and orders in one place.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialog({ open: true, row: null })}
          >
            Add {resource.singular}
          </Button>
        </Box>

        <Box className="stats-grid">
          {[
            ["Products", options.products.length, Inventory2OutlinedIcon, "products"],
            ["Customers", options.users.length, PeopleAltOutlinedIcon, "users"],
            ["Orders", options.orders.length, ReceiptLongOutlinedIcon, "orders"]
          ].map(([label, count, StatIcon, key]) => (
            <Paper key={key} className={`stat-card ${active === key ? "selected" : ""}`} elevation={0}>
              <Box className={`stat-icon ${key}`}><StatIcon /></Box>
              <Box>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="h5" fontWeight={750} sx={{ mt: 0.35 }}>{count}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>

        <Paper className="table-card" elevation={0}>
          <Box className="table-heading">
            <Box>
              <Typography variant="h6" fontWeight={700}>{resource.label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                {rows.length} {resource.label.toLowerCase()} total
              </Typography>
            </Box>
            <Tabs value={active} onChange={(_, value) => setActive(value)} className="resource-tabs">
              {Object.entries(resources).map(([key, item]) => (
                <Tab key={key} value={key} label={item.label} />
              ))}
            </Tabs>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {resource.columns.map((column) => (
                    <TableCell key={column.key}>{column.label}</TableCell>
                  ))}
                  {active === "products" && <TableCell>Status</TableCell>}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={resource.columns.length + 2} align="center" sx={{ py: 7 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : rows.length ? rows.map((row) => (
                  <TableRow hover key={row[resource.idField]}>
                    {resource.columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.format ? column.format(row[column.key]) : row[column.key] || "—"}
                      </TableCell>
                    ))}
                    {active === "products" && (
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.qty > 0 ? "In stock" : "Out of stock"}
                          color={row.qty > 0 ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <IconButton
                        aria-label={`Edit ${resource.singular}`}
                        size="small"
                        onClick={() => setDialog({ open: true, row })}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label={`Delete ${resource.singular}`}
                        size="small"
                        color="error"
                        onClick={() => remove(row)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={resource.columns.length + 2} align="center" sx={{ py: 7 }}>
                      <Icon sx={{ color: "text.disabled", fontSize: 36, mb: 1 }} />
                      <Typography color="text.secondary">No {resource.label.toLowerCase()} yet</Typography>
                      <Button sx={{ mt: 1 }} onClick={() => setDialog({ open: true, row: null })}>
                        Add your first {resource.singular.toLowerCase()}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Typography variant="caption" color="text.secondary" className="footer-note">
          Storefront Admin · SQLite-backed inventory management
        </Typography>
      </Container>

      <ResourceDialog
        key={`${active}-${dialog.row?.[resource.idField] ?? "new"}`}
        resource={resource}
        row={dialog.row}
        options={options}
        open={dialog.open}
        onClose={() => setDialog({ open: false, row: null })}
        onSave={save}
      />
      <Snackbar
        open={notice.open}
        autoHideDuration={4500}
        onClose={() => setNotice((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={() => setNotice((current) => ({ ...current, open: false }))}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
