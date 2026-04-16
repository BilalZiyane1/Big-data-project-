import { useEffect, useMemo, useState } from "react";
import { fetchDashboardStats, fetchAdminUsers, updateAdminUserRole } from "../../api/adminApi";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from "../../api/productApi";
import { fetchAllOrders, updateOrderStatus } from "../../api/orderApi";
import { uploadImage } from "../../api/uploadApi";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { extractProductImageUrl, getProductImageUrl, setImageFallback } from "../../utils/image";

const initialProductForm = {
  name: "",
  description: "",
  price: "",
  category: "men",
  sizes: "S,M,L",
  colors: "Black,White",
  stockQuantity: "0",
  isFeatured: false,
  imageUrl: "",
};

const statusOptions = ["pending", "paid", "shipped", "delivered", "cancelled"];

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [uploadFile, setUploadFile] = useState(null);

  const isEditing = useMemo(() => Boolean(editingProduct), [editingProduct]);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [statsRes, productsRes, usersRes, ordersRes] = await Promise.all([
        fetchDashboardStats(),
        fetchProducts({ page: 1, limit: 20, sort: "latest" }),
        fetchAdminUsers({ page: 1, limit: 20 }),
        fetchAllOrders({ page: 1, limit: 20 }),
      ]);

      setStats(statsRes.data);
      setProducts(productsRes.data || []);
      setUsers(usersRes.data || []);
      setOrders(ordersRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductForm(initialProductForm);
    setUploadFile(null);
    setProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      sizes: (product.sizes || []).join(","),
      colors: (product.colors || []).join(","),
      stockQuantity: String(product.stockQuantity),
      isFeatured: Boolean(product.isFeatured),
      imageUrl: extractProductImageUrl(product),
    });
    setUploadFile(null);
    setProductModalOpen(true);
  };

  const parseList = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSubmitProduct = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      let imageUrl = productForm.imageUrl;
      let publicId;

      if (uploadFile) {
        const uploadResponse = await uploadImage(uploadFile);
        imageUrl = uploadResponse.data.url;
        publicId = uploadResponse.data.publicId;
      }

      const payload = {
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        category: productForm.category,
        sizes: parseList(productForm.sizes),
        colors: parseList(productForm.colors),
        stockQuantity: Number(productForm.stockQuantity),
        isFeatured: productForm.isFeatured,
        images: imageUrl ? [{ url: imageUrl, publicId }] : [],
      };

      if (isEditing) {
        await updateProduct(editingProduct._id, payload);
        setMessage("Product updated");
      } else {
        await createProduct(payload);
        setMessage("Product created");
      }

      setProductModalOpen(false);
      await loadDashboard();
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Could not save product");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((item) => item._id !== id));
      setMessage("Product deleted");
    } catch (_error) {
      setMessage("Could not delete product");
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateAdminUserRole(userId, role);
      setUsers((prev) => prev.map((item) => (item._id === userId ? { ...item, role } : item)));
      setMessage("User role updated");
    } catch (_error) {
      setMessage("Could not update role");
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((item) => (item._id === orderId ? { ...item, status } : item)));
      setMessage("Order status updated");
    } catch (_error) {
      setMessage("Could not update order status");
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <section className="page-enter space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">Admin dashboard</h1>
          <p className="text-sm text-ink/70">Manage products, users, and order operations.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["overview", "products", "users", "orders"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                activeTab === tab
                  ? "bg-ink text-white"
                  : "border border-ink/20 bg-white text-ink hover:border-ink/50"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {message ? (
        <p className="rounded-xl border border-amber-900/20 bg-amber-50 px-3 py-2 text-sm text-ink/80">
          {message}
        </p>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-clay">Total sales</p>
            <p className="mt-2 text-2xl font-bold text-ink">{formatCurrency(stats?.totalSales || 0)}</p>
          </article>
          <article className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-clay">Total users</p>
            <p className="mt-2 text-2xl font-bold text-ink">{stats?.totalUsers || 0}</p>
          </article>
          <article className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-clay">Total orders</p>
            <p className="mt-2 text-2xl font-bold text-ink">{stats?.totalOrders || 0}</p>
          </article>
          <article className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-clay">Total products</p>
            <p className="mt-2 text-2xl font-bold text-ink">{stats?.totalProducts || 0}</p>
          </article>

          <div className="card-surface p-4 md:col-span-2 xl:col-span-4">
            <h2 className="font-display text-2xl font-bold">Monthly sales (last 6 months)</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(stats?.monthlySales || []).map((entry) => (
                <div key={entry._id} className="rounded-xl border border-ink/10 bg-white p-3">
                  <p className="text-sm font-semibold text-ink">{entry._id}</p>
                  <p className="text-sm text-ink/70">{formatCurrency(entry.sales)}</p>
                  <p className="text-xs text-ink/60">{entry.orders} orders</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "products" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={openCreateModal}>
              Add product
            </button>
          </div>

          <div className="space-y-3">
            {products.map((product) => (
              <article key={product._id} className="card-surface p-4">
                <div className="grid gap-3 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                  <img
                    src={getProductImageUrl(product, product?.name)}
                    alt={product.name}
                    className="h-20 w-full rounded-xl object-cover"
                    onError={(event) => setImageFallback(event, product?.name)}
                  />
                  <div>
                    <p className="font-semibold text-ink">{product.name}</p>
                    <p className="text-sm text-ink/70">
                      {product.category} · {formatCurrency(product.price)} · Stock {product.stockQuantity}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => openEditModal(product)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-clay hover:underline"
                      onClick={() => handleDeleteProduct(product._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "users" ? (
        <div className="space-y-3">
          {users.map((item) => (
            <article key={item._id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="text-sm text-ink/70">{item.email}</p>
                <p className="text-xs text-ink/60">Joined {formatDate(item.createdAt)}</p>
              </div>

              <select
                className="input-base w-[180px]"
                value={item.role}
                onChange={(event) => handleRoleChange(item._id, event.target.value)}
              >
                <option value="customer">customer</option>
                <option value="admin">admin</option>
              </select>
            </article>
          ))}
        </div>
      ) : null}

      {activeTab === "orders" ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order._id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-ink">Order #{order._id.slice(-8)}</p>
                <p className="text-sm text-ink/70">
                  {order.user?.name || "Customer"} · {formatCurrency(order.total)}
                </p>
                <p className="text-xs text-ink/60">{formatDate(order.createdAt)}</p>
              </div>

              <select
                className="input-base w-[190px]"
                value={order.status}
                onChange={(event) => handleOrderStatus(order._id, event.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </article>
          ))}
        </div>
      ) : null}

      <Modal
        open={productModalOpen}
        title={isEditing ? "Edit product" : "Create product"}
        onClose={() => setProductModalOpen(false)}
      >
        <form className="grid gap-3" onSubmit={handleSubmitProduct}>
          <label className="text-sm">
            Name
            <input
              className="input-base mt-1"
              required
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label className="text-sm">
            Description
            <textarea
              className="input-base mt-1 min-h-24"
              required
              value={productForm.description}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Price
              <input
                type="number"
                min="0"
                className="input-base mt-1"
                required
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, price: event.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              Stock quantity
              <input
                type="number"
                min="0"
                className="input-base mt-1"
                required
                value={productForm.stockQuantity}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="text-sm">
            Category
            <select
              className="input-base mt-1"
              value={productForm.category}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, category: event.target.value }))
              }
            >
              <option value="men">men</option>
              <option value="women">women</option>
              <option value="kids">kids</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Sizes (comma separated)
              <input
                className="input-base mt-1"
                value={productForm.sizes}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, sizes: event.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              Colors (comma separated)
              <input
                className="input-base mt-1"
                value={productForm.colors}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, colors: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="text-sm">
            Image URL
            <input
              className="input-base mt-1"
              value={productForm.imageUrl}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, imageUrl: event.target.value }))
              }
              placeholder="https://..."
            />
          </label>

          <label className="text-sm">
            Or upload image
            <input
              type="file"
              accept="image/*"
              className="input-base mt-1"
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={productForm.isFeatured}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, isFeatured: event.target.checked }))
              }
            />
            Featured product
          </label>

          <button type="submit" className="btn-primary">
            {isEditing ? "Update product" : "Create product"}
          </button>
        </form>
      </Modal>
    </section>
  );
};

export default AdminDashboardPage;
