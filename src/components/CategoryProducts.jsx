import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import HorizontalScroller from "./HorizontalScroller";
import { API } from "../lib/api";
import { parseProductsResponse } from "../lib/products";

const CategoryProducts = ({ category, title, layout = "sections" }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!category) return;

    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await API.get("/products", {
          params: {
            category,
            limit: layout === "grid" ? 24 : 16,
            page: 1,
          },
        });
        if (!cancelled) setProducts(parseProductsResponse(data).products);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [category, layout]);

  if (!category) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="flex h-48 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[#777682] shadow-sm border border-[#e5e1e9]">
          Loading products…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 text-center">
        <p className="text-xl text-gray-500">
          No products available in this category yet.
        </p>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        {title && (
          <div className="mb-10">
            <h2 className="brand-heading text-3xl font-semibold text-[#1b1b21] mb-2">
              {title}
            </h2>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id ?? product.id} product={product} />
          ))}
        </div>
      </section>
    );
  }

  const sectionSize = 4;
  const sections = [];
  for (let i = 0; i < products.length; i += sectionSize) {
    sections.push(products.slice(i, i + sectionSize));
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
      {sections.map((items, index) => (
        <div key={index} className="mb-8">
          <h3 className="mb-4 text-sm font-semibold text-[#1b1b21]">
            {title ? `${title} — Featured ${index + 1}` : `Featured ${index + 1}`}
          </h3>
          <HorizontalScroller
            ariaLabel={`${category} products section ${index + 1}`}
            contentClassName="flex gap-4 py-2"
          >
            {items.map((product) => (
              <div key={product._id ?? product.id} className="w-64 shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </HorizontalScroller>
        </div>
      ))}
    </section>
  );
};

export default CategoryProducts;
