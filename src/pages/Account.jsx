import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Headphones,
  Heart,
  HelpCircle,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { clearUser, getCurrentUser } from "../lib/user";

const accountCards = [
  {
    title: "Your Orders",
    description: "Track deliveries and review past purchases",
    icon: <Package className="h-7 w-7" strokeWidth={2.2} />,
    to: "/orders",
  },
  {
    title: "Shopping Cart",
    description: "Review items and continue to checkout",
    icon: <ShoppingCart className="h-7 w-7" strokeWidth={2.2} />,
    to: "/cart",
  },
  {
    title: "Wishlist",
    description: "Items you saved for later",
    icon: <Heart className="h-7 w-7" strokeWidth={2.2} />,
    to: "/wishlist",
  },
  {
    title: "Shipping",
    description: "Delivery times and free-shipping thresholds",
    icon: <Truck className="h-7 w-7" strokeWidth={2.2} />,
    to: "/help/shipping",
  },
  {
    title: "Returns",
    description: "How to send an item back",
    icon: <HelpCircle className="h-7 w-7" strokeWidth={2.2} />,
    to: "/help/returns",
  },
  {
    title: "Contact support",
    description: "Get help with an order or account issue",
    icon: <Headphones className="h-7 w-7" strokeWidth={2.2} />,
    to: "/help/contact",
  },
];

const Account = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" state={{ from: "/account" }} replace />;
  }

  const handleLogout = async () => {
    await clearUser();
    navigate("/");
  };

  return (
    <main className="bg-white py-10 sm:py-12">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight text-[#111827]">
              Your Account
            </h1>
            <p className="mt-1 text-sm text-[#474651]">
              Signed in as {user.name || user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[#ba1a1a]/30 px-4 py-2 text-sm font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40"
          >
            Sign out
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accountCards.map(({ title, description, icon, to }) => (
            <Link
              key={title}
              to={to}
              className="group flex min-h-24 items-center gap-4 rounded border border-[#d5d9d9] bg-white px-5 py-4 text-left transition hover:bg-[#f7fafa] hover:border-[#8a9696] hover:shadow-sm"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e2dfff] text-[#1a146b]">
                {icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-5 text-[#111827]">
                  {title}
                </span>
                <span className="mt-1 block text-xs leading-4 text-[#374151]">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Account;
