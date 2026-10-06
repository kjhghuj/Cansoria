import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const BACKEND_URL = "/api/medusa";
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";


interface AccountUser {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export function ProfileContent({ user }: { user: AccountUser | null }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const response = await fetch(`${BACKEND_URL}/store/customers/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": API_KEY,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (response.ok) {
        setProfileMessage("Profile updated successfully! (Refresh to see changes globally)");
      } else {
        throw new Error("Failed to update profile");
      }
    } catch {
      setProfileMessage("Failed to save changes. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-white p-8 border border-gray-100">
      <h2 className="font-serif text-2xl text-charcoal mb-6">Profile Details</h2>

      {profileMessage && (
        <div className={`mb-4 p-4 text-sm ${profileMessage.includes("success") ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"} border`}>
          {profileMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal bg-gray-50"
            disabled
          />
          <p className="text-xs text-charcoal-light mt-1">Email cannot be changed</p>
        </div>
      </div>

      <button
        onClick={handleSaveProfile}
        disabled={savingProfile}
        className="mt-6 bg-charcoal text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-charcoal/90 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
        {savingProfile ? "Saving..." : "Save Changes"}
      </button>


    </div>
  );
}
