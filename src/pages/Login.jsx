import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { API } from "../lib/api";
import { setCurrentUser } from "../lib/user";
import { useNotification } from "../hooks/useNotification";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = ({ heading }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotification();
  const isSignup = location.pathname === "/signup";
  const redirectTo = location.state?.from || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("userInfo")) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const finishLogin = (user) => {
    setCurrentUser(user);
    navigate(redirectTo, { replace: true });
  };

  const handleGoogle = async (credentialResponse) => {
    try {
      const { data } = await API.post("/auth/google", {
        credential: credentialResponse.credential,
      });
      finishLogin(data);
    } catch (err) {
      notify.error(err.message || "Google sign-in failed");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = isSignup ? "/auth/register" : "/auth/login";
      const payload = isSignup
        ? { name, email, password }
        : { email, password };
      const { data } = await API.post(endpoint, payload);
      finishLogin(data);
    } catch (err) {
      notify.error(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-[#e5e1e9] bg-white p-8 shadow-xl"
      >
        <div>
          <h2 className="text-3xl font-bold text-[#1a146b] mb-2">
            {heading || (isSignup ? "Create an account" : "Welcome back")}
          </h2>
          <p className="text-sm text-[#777682]">
            {isSignup
              ? "Save addresses, track orders, and check out faster."
              : "Sign in to checkout, view orders, and manage your account."}
          </p>
        </div>

        {isSignup && (
          <input
            type="text"
            required
            minLength={2}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#e5e1e9] bg-[#f6f2fa] px-4 py-3 outline-none focus:ring-2 focus:ring-[#1a146b]"
          />
        )}
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[#e5e1e9] bg-[#f6f2fa] px-4 py-3 outline-none focus:ring-2 focus:ring-[#1a146b]"
        />
        <input
          type="password"
          required
          minLength={isSignup ? 8 : 1}
          placeholder={isSignup ? "Password (8+ characters)" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-[#e5e1e9] bg-[#f6f2fa] px-4 py-3 outline-none focus:ring-2 focus:ring-[#1a146b]"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-70"
          style={{
            backgroundImage: "linear-gradient(90deg, #1a146b 0%, #312e81 100%)",
          }}
        >
          {submitting
            ? "Please wait..."
            : isSignup
              ? "Create account"
              : "Sign in"}
        </button>

        {googleClientId && (
          <>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e5e1e9]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-[#777682]">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() =>
                  notify.warning("Google sign-in was closed or failed.")
                }
                theme="outline"
                size="large"
              />
            </div>
          </>
        )}

        <p className="text-center text-sm text-[#777682]">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <Link
            to={isSignup ? "/login" : "/signup"}
            state={location.state}
            className="font-semibold text-[#1a146b] hover:text-[#006b5f]"
          >
            {isSignup ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
