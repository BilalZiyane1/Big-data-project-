import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(form);
      navigate("/");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-enter mx-auto w-full max-w-md card-surface p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold">Create account</h1>
      <p className="mt-1 text-sm text-ink/70">Join FashionHub to track orders and save favorites.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-ink">
          Full name
          <input
            type="text"
            required
            className="input-base mt-1"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>

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
          <span className="mt-1 block text-xs text-ink/60">
            Use at least 8 chars including uppercase, lowercase, and a number.
          </span>
        </label>

        {error ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/70">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-clay hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
};

export default RegisterPage;
