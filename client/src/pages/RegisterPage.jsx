import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        department: department || undefined,
      });

      navigate("/", { replace: true });
    } catch (err) {
      const details = err.details?.details;

      setFormError(
        Array.isArray(details)
          ? details.join(" ")
          : err.message || "Could not create your account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold text-ink">
            Document AI
          </h1>

          <p className="mt-2 text-sm text-ink-soft">
            Create your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-sm border border-border bg-surface p-6 shadow-sm"
        >
          {formError && (
            <div className="mb-4 rounded-sm border border-error-600/30 bg-error-50 px-3 py-2 text-sm text-error-600">
              {formError}
            </div>
          )}

          <label
            className="mb-1 block text-sm font-medium text-ink"
            htmlFor="name"
          >
            Full name
          </label>

          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            placeholder="Ada Lovelace"
          />

          <label
            className="mb-1 block text-sm font-medium text-ink"
            htmlFor="email"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            placeholder="you@company.com"
          />

          <label
            className="mb-1 block text-sm font-medium text-ink"
            htmlFor="department"
          >
            Department{" "}
            <span className="font-normal text-ink-faint">
              (optional)
            </span>
          </label>

          <input
            id="department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mb-4 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            placeholder="Finance, HR, Engineering…"
          />

          <label
            className="mb-1 block text-sm font-medium text-ink"
            htmlFor="password"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-1 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
            placeholder="At least 8 characters"
          />

          <p className="mb-6 text-xs text-ink-faint">
            Use at least 8 characters.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}

          <Link
            to="/login"
            className="font-medium text-teal-600 hover:text-teal-700"
          >
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}
