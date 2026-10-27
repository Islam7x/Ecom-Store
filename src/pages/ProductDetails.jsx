import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API } from "../lib/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  formatMoney,
  PLACEHOLDER_IMAGE,
  productId,
} from "../lib/format";
import { categoryToSlug } from "../lib/categories";
import { parseProductsResponse } from "../lib/products";
import ProductCard from "../components/ProductCard";
import { ChevronLeft, Heart, RotateCcw, Shield, Truck } from "lucide-react";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await API.get(`/products/${id}`);
        setProduct(data);
        setQuantity(1);
        setError(null);

        if (data?.category) {
          const relatedResponse = await API.get("/products", {
            params: { category: data.category, limit: 8, page: 1 },
          });
          const parsed = parseProductsResponse(relatedResponse.data);
          setRelated(
            parsed.products.filter((item) => productId(item) !== productId(data)),
          );
        } else {
          setRelated([]);
        }
      } catch (err) {
        setError(err.message || "Product not found");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-gray-200 animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-[#1a146b] hover:text-[#006b5f] transition"
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-lg font-semibold text-red-800">
            {error || "Product not found"}
          </p>
        </div>
      </main>
    );
  }

  const currentStock = Number.isFinite(Number(product.stock))
    ? Number(product.stock)
    : 0;
  const isSoldOut = currentStock <= 0;
  const saved = isInWishlist(product);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setQuantity(1);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-[#777682]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 font-semibold text-[#1a146b] hover:text-[#006b5f]"
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <span>/</span>
        {product.category && (
          <Link
            to={`/category/${categoryToSlug(product.category)}`}
            className="hover:text-[#1a146b]"
          >
            {product.category}
          </Link>
        )}
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div
          className={`relative aspect-square overflow-hidden rounded-2xl bg-[#f0ecf4] ${
            isSoldOut ? "opacity-70" : ""
          }`}
        >
          <img
            src={product.image || PLACEHOLDER_IMAGE}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
          />
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a146b]/45 backdrop-blur-[2px]">
              <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-[#1b1b21] shadow-xl">
                Sold Out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#777682]">
            {product.category || "Marketplace"}
          </p>
          <h1 className="brand-heading text-4xl font-bold text-[#1b1b21] mb-4">
            {product.name}
          </h1>

          <div className="mb-6 pb-6 border-b border-gray-200">
            <span className="brand-heading text-4xl font-bold text-[#1a146b]">
              {formatMoney(product.price)}
            </span>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-[#1b1b21] mb-3">Description</h3>
            <p className="text-[#474651] leading-relaxed">
              {product.description ||
                "A carefully selected item from the LUXE catalog. Check stock and add it to your bag when you are ready."}
            </p>
          </div>

          <p
            className={`mb-8 text-sm font-bold ${
              isSoldOut
                ? "text-[#ba1a1a]"
                : currentStock > 5
                  ? "text-green-700"
                  : "text-orange-600"
            }`}
          >
            {isSoldOut
              ? "Out of stock"
              : currentStock <= 5
                ? `Only ${currentStock} left`
                : "In stock"}
          </p>

          {!isSoldOut && (
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-[#c8c5d3] bg-[#f6f2fa] px-4 py-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-lg font-bold text-[#474651] hover:bg-white hover:text-[#ba1a1a] transition"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-bold text-[#1b1b21]">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(Math.min(currentStock, quantity + 1))
                  }
                  disabled={quantity >= currentStock}
                  className={`h-8 w-8 flex items-center justify-center rounded-full text-lg font-bold transition ${
                    quantity >= currentStock
                      ? "cursor-not-allowed text-[#c8c5d3]"
                      : "cursor-pointer text-[#474651] hover:bg-white hover:text-[#1a146b]"
                  }`}
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 min-w-40 rounded-lg bg-[#1a146b] px-6 py-3 text-white font-bold hover:bg-[#13104f] transition active:scale-95"
              >
                Add to Cart
              </button>
            </div>
          )}

          {isSoldOut && (
            <button
              disabled
              className="w-full rounded-lg bg-[#777682] px-6 py-3 text-white font-bold cursor-not-allowed mb-6"
            >
              Out of Stock
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#474651] hover:text-[#ba1a1a]"
          >
            <Heart
              size={18}
              className={saved ? "fill-[#ba1a1a] text-[#ba1a1a]" : ""}
            />
            {saved ? "Saved to wishlist" : "Save for later"}
          </button>

          <div className="space-y-4 border-t border-gray-200 pt-8">
            <div className="flex gap-4">
              <Truck size={24} className="text-[#006b5f] shrink-0" />
              <div>
                <h4 className="font-semibold text-[#1b1b21]">Free Shipping</h4>
                <p className="text-sm text-[#474651]">
                  On qualifying orders in your delivery area
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Shield size={24} className="text-[#006b5f] shrink-0" />
              <div>
                <h4 className="font-semibold text-[#1b1b21]">
                  Secure Checkout
                </h4>
                <p className="text-sm text-[#474651]">
                  Card payments are processed by Stripe
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <RotateCcw size={24} className="text-[#006b5f] shrink-0" />
              <div>
                <h4 className="font-semibold text-[#1b1b21]">30-Day Returns</h4>
                <p className="text-sm text-[#474651]">
                  Unused items can be returned through support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="brand-heading text-2xl font-semibold text-[#1b1b21] mb-6">
            More in {product.category}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((item) => (
              <ProductCard key={productId(item)} product={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default ProductDetails;
