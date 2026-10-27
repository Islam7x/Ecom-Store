import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { ShoppingCart, Package, Heart, LogIn, Search } from "lucide-react";
import LocationSelector from "./LocationSelector";
import { clearUser } from "../lib/user";

const Navbar = () => {
  const { cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState(() => ({
    locationSearch: location.search,
    query: new URLSearchParams(location.search).get("search") || "",
  }));
  const searchQuery =
    searchState.locationSearch === location.search
      ? searchState.query
      : new URLSearchParams(location.search).get("search") || "";
  const updateSearchQuery = (query) =>
    setSearchState({ locationSearch: location.search, query });
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("userInfo");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    const syncUser = () => {
      const storedUser = localStorage.getItem("userInfo");
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    window.addEventListener("auth:changed", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("auth:changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const handleLogout = async () => {
    await clearUser();
    setUser(null);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
    setMobileSearchOpen(false);
  };

  const displayName = user?.name || user?.email || "Account";
  const initials = displayName
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/10 shadow-lg backdrop-blur-xl">
      <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#1a146b] rounded-lg p-2 hover:-translate-y-0.5"
            aria-label="LUXE Home"
          >
            <div
              className="rounded-lg p-2 shadow-md hover:shadow-lg transition-shadow"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #1a146b 0%, #006b5f 100%)",
              }}
            >
              <img
                src="/images/logo.svg"
                alt="LUXE Logo"
                className="h-10 w-10 object-contain brightness-0 invert"
              />
            </div>
            <span
              className="luxe-font hidden text-2xl font-bold text-transparent sm:inline tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #1a146b 0%, #006b5f 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              LUXE
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden text-xs font-semibold uppercase tracking-wide text-[#777682] lg:inline">
            Deliver to
          </span>
          <LocationSelector />
        </div>

        <form
          onSubmit={submitSearch}
          className="hidden flex-1 justify-center px-8 lg:flex"
        >
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777682]" />
            <input
              type="search"
              aria-label="Search products"
              className="w-full rounded-full border border-transparent bg-[#f6f2fa] py-3 pl-11 pr-4 text-sm outline-none transition shadow-md hover:shadow-[0_4px_12px_rgba(26,20,107,0.2)] focus:shadow-[0_8px_16px_rgba(26,20,107,0.25)] focus:border-[#1a146b] focus:ring-0"
              placeholder="Search phones, fashion, home..."
              value={searchQuery}
              onChange={(e) => updateSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex rounded-lg p-2 text-[#474651] hover:bg-[#f6f2fa] lg:hidden"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label="Search products"
          >
            <Search size={20} />
          </button>
          {user ? (
            <div className="relative">
              {user.picture ? (
                <Link
                  to="/account"
                  aria-label="Your account"
                  className="peer block h-10 w-10 rounded-full border-2 border-[#001a4d] shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#312e81] focus:ring-offset-2"
                >
                  <img
                    src={user.picture}
                    alt={displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                </Link>
              ) : (
                <Link
                  to="/account"
                  aria-label="Your account"
                  className="peer flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-[#001a4d] bg-[#e2dfff] text-sm font-bold text-[#1a146b] shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#312e81] focus:ring-offset-2"
                >
                  {initials || "U"}
                </Link>
              )}
              <div className="invisible absolute right-0 z-50 mt-3 w-52 rounded-xl border border-[#e5e1e9] bg-white opacity-0 shadow-xl transition-all peer-hover:visible peer-hover:opacity-100 hover:visible hover:opacity-100">
                <div className="border-b border-[#e5e1e9] px-4 py-3">
                  <p className="text-xs text-[#777682]">Signed in as</p>
                  <p className="truncate text-sm font-bold text-[#1b1b21]">
                    {displayName}
                  </p>
                </div>
                <Link
                  to="/account"
                  className="block px-4 py-3 text-sm font-semibold text-[#1a146b] transition-colors hover:bg-[#f6f2fa]"
                >
                  Your Account
                </Link>
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    className="block px-4 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 border-t border-[#e5e1e9]"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full cursor-pointer rounded-b-xl px-4 py-3 text-left text-sm font-semibold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            location.pathname !== "/login" &&
            location.pathname !== "/signup" && (
              <Link
                to="/login"
                className="hidden items-center gap-1.5 rounded-lg border border-[#1a146b] px-4 py-2 text-sm font-bold text-[#1a146b] transition hover:bg-[#1a146b] hover:text-white sm:inline-flex"
              >
                <LogIn size={18} />
                Sign In
              </Link>
            )
          )}

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white bg-[#001a4d] transition hover:bg-[#003366] active:scale-95"
          >
            <div className="relative inline-flex">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff8c42] px-1 text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Cart</span>
          </Link>
          <Link
            to="/orders"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#474651] transition hover:text-[#1a146b] hover:bg-[#f6f2fa] sm:inline-flex"
          >
            <Package size={18} />
            Orders
          </Link>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#474651] transition hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 sm:inline-flex"
          >
            <Heart size={18} />
            Wishlist
            {wishlistCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ba1a1a] px-1 text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </Link>
        </div>
      </nav>
      {mobileSearchOpen && (
        <form
          onSubmit={submitSearch}
          className="border-t border-[#e5e1e9] bg-white px-4 py-3 lg:hidden"
        >
          <input
            type="search"
            aria-label="Search products"
            className="w-full rounded-full border border-[#e5e1e9] bg-[#f6f2fa] px-4 py-3 text-sm outline-none focus:border-[#1a146b]"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            autoFocus
          />
        </form>
      )}
    </header>
  );
};

export default Navbar;
