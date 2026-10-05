"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/providers";

// Components
import { LoginForm } from "./components/LoginForm";
import { ProfileContent } from "./components/ProfileContent";
import { OrdersContent } from "./components/OrdersContent";
import { CouponsContent } from "./components/CouponsContent";
import { AddressesContent } from "./components/AddressesContent";
import { AccountSidebar } from "./components/AccountSidebar";

type Tab = "profile" | "orders" | "addresses" | "coupons";

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";

  // Global Auth
  const { user, loading: authLoading, logout } = useAuth();

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const handleLogout = () => {
    logout();
    router.push("/account"); // Refresh or stay
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  // Login form
  if (!user) {
    return <LoginForm justRegistered={justRegistered} />;
  }

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl text-charcoal">My Account</h1>
          <p className="text-sm text-charcoal-light">
            Welcome, {user?.first_name || user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <AccountSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleLogout={handleLogout}
          />

          {/* Content */}
          <div className="md:col-span-3">
            {activeTab === "profile" && <ProfileContent user={user} />}
            {activeTab === "orders" && <OrdersContent user={user} />}
            {activeTab === "addresses" && <AddressesContent />}
            {activeTab === "coupons" && <CouponsContent user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    }>
      <AccountContent />
    </Suspense>
  );
}
