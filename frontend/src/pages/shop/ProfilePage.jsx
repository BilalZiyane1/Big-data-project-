import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchMyOrders } from "../../api/orderApi";
import { fetchProfile, fetchWishlist, removeFromWishlist, updateProfile } from "../../api/userApi";
import Loader from "../../components/common/Loader";
import useAuth from "../../hooks/useAuth";
import { formatCurrency, formatDate } from "../../utils/formatters";

const ProfilePage = () => {
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);

    try {
      const [profileResponse, ordersResponse, wishlistResponse] = await Promise.all([
        fetchProfile(),
        fetchMyOrders({ page: 1, limit: 8 }),
        fetchWishlist(),
      ]);

      setProfile({
        name: profileResponse.data.name,
        email: profileResponse.data.email,
      });
      setOrders(ordersResponse.data || []);
      setWishlist(wishlistResponse.data || []);
      setUser(profileResponse.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProfileUpdate = async (event) => {
    event.preventDefault();

    try {
      const response = await updateProfile(profile);
      setUser(response.data);
      setMessage("Profile updated");
    } catch (apiError) {
      setMessage(apiError.response?.data?.message || "Profile update failed");
    }
  };

  const handleWishlistRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((item) => item._id !== productId));
    } catch (_error) {
      setMessage("Could not remove wishlist item");
    }
  };

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (loading) return <Loader fullPage />;

  return (
    <section className="page-enter grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <form className="card-surface space-y-4 p-5" onSubmit={handleProfileUpdate}>
          <h1 className="font-display text-3xl font-bold">My profile</h1>

          <label className="block text-sm">
            Name
            <input
              className="input-base mt-1"
              value={profile.name}
              onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label className="block text-sm">
            Email
            <input
              className="input-base mt-1"
              value={profile.email}
              onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <button type="submit" className="btn-primary">
            Save changes
          </button>

          {message ? (
            <p className="rounded-xl border border-amber-900/20 bg-amber-50 px-3 py-2 text-sm text-ink/80">
              {message}
            </p>
          ) : null}
        </form>

        <div className="card-surface p-5">
          <h2 className="font-display text-2xl font-bold">Wishlist</h2>
          <div className="mt-3 space-y-3">
            {wishlist.length ? (
              wishlist.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-white p-3">
                  <div>
                    <p className="font-semibold text-ink">{item.name}</p>
                    <p className="text-sm text-ink/70">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link className="btn-secondary" to={`/products/${item._id}`}>
                      View
                    </Link>
                    <button
                      type="button"
                      className="text-sm font-semibold text-clay hover:underline"
                      onClick={() => handleWishlistRemove(item._id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/70">Your wishlist is empty.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="font-display text-2xl font-bold">Recent orders</h2>

        <div className="mt-3 space-y-3">
          {orders.length ? (
            orders.map((order) => (
              <article key={order._id} className="rounded-xl border border-ink/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">Order #{order._id.slice(-8)}</p>
                  <span className="rounded-full bg-ink/8 px-3 py-1 text-xs font-semibold uppercase text-ink">
                    {order.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/70">{formatDate(order.createdAt)}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatCurrency(order.total)}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-ink/70">No orders yet.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
