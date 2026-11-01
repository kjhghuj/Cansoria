import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FlLoginForm from "@/components/florencess/FlLoginForm";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Account Login"),
  alternates: { canonical: "/account/login" },
  robots: { index: false, follow: false },
};

export default function AccountLoginPage() {
  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">Account Login</h1>
      </div>
      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li><Link href="/">Home</Link></li>
          <li>Account Login</li>
        </ol>
        <Suspense fallback={null}>
          <FlLoginForm />
        </Suspense>
      </div>
    </>
  );
}
