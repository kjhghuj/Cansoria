import { useState, useEffect } from "react";
import { MapPin, Loader2, Plus, Edit, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9030";
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

// Helper to get auth token
const getAuthToken = () => localStorage.getItem("medusa_auth_token");

interface Address {
  id: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone?: string;
  is_default_shipping?: boolean;
}

export function AddressesContent() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoadingAddresses(true);
    try {
      const response = await fetch(`${BACKEND_URL}/store/customers/me/addresses`, {
        headers: {
          "x-publishable-api-key": API_KEY,
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSaveAddress = async (formData: FormData) => {
    const addressData = {
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      address_1: formData.get("address1") as string,
      address_2: formData.get("address2") as string,
      city: formData.get("city") as string,
      postal_code: formData.get("postalCode") as string,
      country_code: (formData.get("country") as string).toLowerCase().slice(0, 2),
      phone: formData.get("phone") as string,
      is_default_shipping: formData.get("isDefault") === "on",
    };

    const token = getAuthToken();

    try {
      const url = editingAddress
        ? `${BACKEND_URL}/store/customers/me/addresses/${editingAddress.id}`
        : `${BACKEND_URL}/store/customers/me/addresses`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": API_KEY,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });

      if (response.ok) {
        setShowAddressModal(false);
        setEditingAddress(null);
        fetchAddresses();
      }
    } catch (error) {
      console.error("Error saving address:", error);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    const token = getAuthToken();

    try {
      await fetch(`${BACKEND_URL}/store/customers/me/addresses/${addressId}`, {
        method: "DELETE",
        headers: {
          "x-publishable-api-key": API_KEY,
          "Authorization": `Bearer ${token}`,
        },
      });
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  return (
    <div className="bg-white p-8 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-charcoal">Saved Addresses</h2>
        <button
          onClick={() => {
            setEditingAddress(null);
            setShowAddressModal(true);
          }}
          className="flex items-center gap-2 text-sm text-terracotta hover:underline"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      {loadingAddresses ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-charcoal-light mb-4">No saved addresses</p>
          <button
            onClick={() => setShowAddressModal(true)}
            className="inline-block bg-terracotta text-white px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div key={address.id} className="border border-gray-100 p-6 relative">
              {address.is_default_shipping && (
                <span className="absolute top-4 right-4 text-xs bg-terracotta/10 text-terracotta px-2 py-1 uppercase tracking-wider">
                  Default
                </span>
              )}
              <p className="font-medium text-charcoal">{address.first_name} {address.last_name}</p>
              <p className="text-sm text-charcoal-light mt-2">{address.address_1}</p>
              {address.address_2 && <p className="text-sm text-charcoal-light">{address.address_2}</p>}
              <p className="text-sm text-charcoal-light">{address.city}, {address.postal_code}</p>
              <p className="text-sm text-charcoal-light">{address.country_code?.toUpperCase()}</p>
              {address.phone && <p className="text-sm text-charcoal-light mt-2">{address.phone}</p>}

              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4">
                <button
                  onClick={() => {
                    setEditingAddress(address);
                    setShowAddressModal(true);
                  }}
                  className="text-sm text-charcoal hover:text-terracotta flex items-center gap-1"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteAddress(address.id)}
                  className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-serif text-xl text-charcoal">
                {editingAddress ? "Edit Address" : "Add New Address"}
              </h3>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveAddress(new FormData(e.currentTarget));
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">First Name</label>
                  <input
                    name="firstName"
                    defaultValue={editingAddress?.first_name}
                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Last Name</label>
                  <input
                    name="lastName"
                    defaultValue={editingAddress?.last_name}
                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Address Line 1</label>
                <input
                  name="address1"
                  defaultValue={editingAddress?.address_1}
                  className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Address Line 2 (Optional)</label>
                <input
                  name="address2"
                  defaultValue={editingAddress?.address_2}
                  className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">City</label>
                  <input
                    name="city"
                    defaultValue={editingAddress?.city}
                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Postal Code</label>
                  <input
                    name="postalCode"
                    defaultValue={editingAddress?.postal_code}
                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Country</label>
                <select
                  name="country"
                  defaultValue={editingAddress?.country_code || "gb"}
                  className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                  required
                >
                  <option value="gb">United Kingdom</option>
                  <option value="us">United States</option>
                  <option value="de">Germany</option>
                  <option value="fr">France</option>
                  <option value="nl">Netherlands</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Phone (Optional)</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={editingAddress?.phone}
                  className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isDefault"
                  id="isDefault"
                  defaultChecked={editingAddress?.is_default_shipping}
                  className="w-4 h-4"
                />
                <label htmlFor="isDefault" className="text-sm text-charcoal">Set as default address</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(false);
                    setEditingAddress(null);
                  }}
                  className="flex-1 border border-gray-200 py-3 uppercase tracking-widest text-xs font-bold text-charcoal hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-terracotta text-white py-3 uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors"
                >
                  {editingAddress ? "Update" : "Add"} Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
