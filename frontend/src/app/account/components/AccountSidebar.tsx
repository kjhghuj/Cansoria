import { User as UserIcon, Package, MapPin, LogOut, Ticket } from "lucide-react";

interface AccountSidebarProps {
  activeTab: "profile" | "orders" | "addresses" | "coupons";
  setActiveTab: (tab: "profile" | "orders" | "addresses" | "coupons") => void;
  handleLogout: () => void;
}

export function AccountSidebar({ activeTab, setActiveTab, handleLogout }: AccountSidebarProps) {
  const navItems = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "orders", label: "Orders", icon: Package },
    { id: "addresses", label: "Addresses", icon: MapPin },
    { id: "coupons", label: "Coupons", icon: Ticket },
  ] as const;

  return (
    <div className="md:col-span-1 border-b md:border-none border-gray-100 pb-2 md:pb-0 mb-6 md:mb-0">
      <nav className="flex flex-row md:flex-col justify-between md:justify-start gap-1 md:space-y-2 overflow-x-auto no-scrollbar md:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                group flex items-center transition-all duration-200 rounded-lg whitespace-nowrap outline-none
                flex-col justify-center p-2 text-[10px] min-w-[70px] flex-1 md:flex-none
                md:flex-row md:justify-start md:px-4 md:py-3 md:text-sm md:w-full md:min-w-0
                ${isActive
                  ? "text-terracotta bg-terracotta/5 md:bg-terracotta/10 font-medium"
                  : "text-charcoal-light hover:text-charcoal hover:bg-gray-50 bg-transparent"
                }
              `}
            >
              <Icon
                className={`mb-1 md:mb-0 md:mr-3 transition-transform group-hover:scale-105 ${isActive ? "text-terracotta" : "text-charcoal-light group-hover:text-charcoal"
                  }`}
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={handleLogout}
          className="
            group flex items-center transition-all duration-200 rounded-lg whitespace-nowrap outline-none
            flex-col justify-center p-2 text-[10px] min-w-[70px] flex-1 md:flex-none
            md:flex-row md:justify-start md:px-4 md:py-3 md:text-sm md:w-full md:mt-4
            text-charcoal-light hover:text-red-600 hover:bg-red-50
          "
        >
          <LogOut className="mb-1 md:mb-0 md:mr-3 group-hover:scale-105" size={20} />
          <span>Sign Out</span>
        </button>
      </nav>
    </div>
  );
}
