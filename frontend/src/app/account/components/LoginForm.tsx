import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/providers";

export function LoginForm({ justRegistered }: { justRegistered: boolean }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      await login(email, password);
    } catch {
      setLoginError("Invalid email or password. Please check your credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-md mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8 text-center">
          My Account
        </h1>

        {justRegistered && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 text-sm text-center">
            Account created successfully! Please sign in.
          </div>
        )}

        <div className="bg-white p-8 border border-gray-100">
          <h2 className="font-serif text-xl text-charcoal mb-6">Sign In</h2>

          {loginError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-terracotta text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoggingIn ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="#" className="text-sm text-charcoal-light hover:text-terracotta">
              Forgot password?
            </Link>
          </div>

          <hr className="my-8 border-gray-100" />

          <div className="text-center">
            <p className="text-sm text-charcoal-light mb-4">
              Don&apos;t have an account?
            </p>
            <Link
              href="/register"
              className="text-sm uppercase tracking-widest text-terracotta font-bold hover:underline"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
