"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9030";
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "";
}

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Validate password length
        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            // Step 1: Register with email/password via auth endpoint
            const authResponse = await fetch(`${BACKEND_URL}/auth/customer/emailpass/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-publishable-api-key": API_KEY,
                },
                credentials: "include",
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                }),
            });

            if (!authResponse.ok) {
                const authError = (await authResponse.json()) as { message?: string };
                throw new Error(authError.message || "Registration failed");
            }

            const authData = await authResponse.json();
            const token = authData.token;

            // Step 2: Create customer profile
            // Split full name
            const names = formData.fullName.trim().split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ') || "";

            const customerResponse = await fetch(`${BACKEND_URL}/store/customers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-publishable-api-key": API_KEY,
                    "Authorization": `Bearer ${token}`,
                },
                credentials: "include",
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: formData.email,
                }),
            });

            if (!customerResponse.ok) {
                const customerError = (await customerResponse.json()) as { message?: string };
                throw new Error(customerError.message || "Failed to create profile");
            }

            // Success!
            // Store token for auto-login
            localStorage.setItem("medusa_auth_token", token);

            setSuccess(true);
            setTimeout(() => {
                router.push("/account");
            }, 1500);

        } catch (err: unknown) {
            console.error("Registration error:", err);
            const message = getErrorMessage(err);
            if (message.includes("already") || message.includes("duplicate") || message.includes("exists")) {
                setError("An account with this email already exists. Please sign in.");
            } else {
                setError(message || "Registration failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pt-24 pb-16">
            <div className="max-w-md mx-auto px-6">
                <h1 className="font-serif text-4xl text-charcoal mb-8 text-center">
                    Create Account
                </h1>

                <div className="bg-white p-8 border border-gray-100">
                    <p className="text-sm text-charcoal-light mb-6 text-center">
                        Join Cansoria for exclusive offers, order tracking, and faster checkout.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 text-sm text-center">
                            ✓ Account created successfully! Redirecting...
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
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
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                                required
                                minLength={8}
                            />
                            <p className="text-xs text-charcoal-light mt-1">
                                Must be at least 8 characters
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-terracotta text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-charcoal-light">
                        By creating an account, you agree to our{" "}
                        <Link href="/terms" className="underline hover:text-terracotta">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="underline hover:text-terracotta">
                            Privacy Policy
                        </Link>
                        .
                    </div>

                    <hr className="my-8 border-gray-100" />

                    <div className="text-center">
                        <p className="text-sm text-charcoal-light mb-4">
                            Already have an account?
                        </p>
                        <Link
                            href="/account"
                            className="text-sm uppercase tracking-widest text-terracotta font-bold hover:underline"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
