import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const destination = location.state?.from || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(form);
      const isAdminUser = response?.data?.user?.role === "admin";
      const nextRoute =
        location.state?.from || (isAdminUser ? "/admin" : destination);
      navigate(nextRoute, { replace: true });
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-enter mx-auto w-full max-w-md card-surface p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink/70">Sign in to continue shopping.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            className="input-base mt-1"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Password
          <input
            type="password"
            required
            className="input-base mt-1"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/70">
        New customer?{" "}
        <Link to="/register" className="font-semibold text-clay hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
};

export default LoginPage;
