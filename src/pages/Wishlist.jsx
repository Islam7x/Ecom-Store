import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import ProductCard from "../components/ProductCard";
import { productId } from "../lib/format";

const Wishlist = () => {
  const { items } = useWishlist();

  if (items.length === 0) {
    return (
      <main className="mx-auto min-h-[70vh] px-4 py-12 sm:px-6 lg:px-10">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="mb-6 rounded-full bg-[#e2dfff] p-6">
            <Heart size={48} className="text-[#1a146b]" />
          </div>
          <h1 className="brand-heading text-4xl font-bold text-[#1a146b] mb-4">
            Your wishlist is empty.
          </h1>
          <p className="text-lg text-[#474651] mb-8">
            Tap the heart on any product to save it here for later.
          </p>
          <Link
            to="/"
            className="inline-flex rounded-lg px-8 py-4 text-sm font-bold text-white"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #1a146b 0%, #312e81 100%)",
            }}
          >
            Explore Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
      <div className="mb-10">
        <h1 className="brand-heading text-5xl font-bold text-[#1a146b] flex items-center gap-3">
          <Heart className="text-[#ba1a1a]" size={40} />
          Your Wishlist
        </h1>
        <p className="mt-2 text-lg text-[#474651]">
          {items.length} saved item{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={productId(item)} product={item} />
        ))}
      </div>
    </main>
  );
};

export default Wishlist;
