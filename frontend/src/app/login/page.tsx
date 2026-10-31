import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FlLoginForm from "@/components/florencess/FlLoginForm";

export const metadata: Metadata = {
  title: "Account Login | FLORENCESS",
  description: "Sign in to your FLORENCESS account.",
  alternates: { canonical: "/account/login" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">Account Login</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>Login</li>
        </ol>
      </div>

      <div className="fl-container">
        <Suspense fallback={null}>
          <FlLoginForm />
        </Suspense>
        <p className="fl-form__hint" style={{ textAlign: "center", paddingBottom: 64 }}>
          New customer? <Link className="fl-info__link" href="/register">Register</Link>
        </p>
      </div>
    </>
  );
}
