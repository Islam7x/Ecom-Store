import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Carousel from "../components/Carousel";
import ProductFilters from "../components/ProductFilters";
import ProductSlider from "../components/ProductSlider";
import { API } from "../lib/api";
import { STORE_CATEGORIES } from "../lib/categories";
import { parseProductsResponse } from "../lib/products";

const PAGE_SIZE = 12;

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const searchQuery = params.get("search") || "";
  const selectedCategory = params.get("category") || "";
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";
  const sort = params.get("sort") || "newest";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);

  const updateFilters = (updates) => {
    const next = new URLSearchParams(location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    if (!("page" in updates)) next.delete("page");
    navigate(
      { pathname: location.pathname === "/" ? "/" : "/products", search: next.toString() },
      { replace: true },
    );
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await API.get("/products/categories");
        if (Array.isArray(data)) setCategories(data);
      } catch {
        setCategories(STORE_CATEGORIES.map((category) => category.name));
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await API.get("/products", {
          params: {
            search: searchQuery,
            category: selectedCategory,
            minPrice,
            maxPrice,
            sort,
            page,
            limit: PAGE_SIZE,
          },
        });
        const parsed = parseProductsResponse(data);
        setProducts(parsed.products);
        setTotal(parsed.total);
        setPages(parsed.pages);
      } catch (err) {
        setError(err.message || "Could not load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    const handleProductsUpdated = () => {
      fetchProducts();
    };
    window.addEventListener("products:updated", handleProductsUpdated);

    return () => {
      window.removeEventListener("products:updated", handleProductsUpdated);
    };
  }, [selectedCategory, minPrice, maxPrice, sort, searchQuery, page]);

  const showBrowseSections = !searchQuery && !selectedCategory && page === 1;

  return (
    <main>
      {showBrowseSections && <Carousel />}

      {showBrowseSections && (
        <section
          id="collections"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10"
        >
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="brand-heading text-3xl font-semibold text-[#1b1b21]">
                Shop by category
              </h2>
              <p className="mt-2 text-[#474651]">
                Browse the departments customers actually shop every day.
              </p>
            </div>
            <a
              className="font-semibold text-[#006b5f] hover:underline"
              href="#products"
            >
              See all products
            </a>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STORE_CATEGORIES.slice(0, 3).map((collection) => (
              <Link
                key={collection.slug}
                to={`/category/${collection.slug}`}
                className="group relative aspect-4/5 overflow-hidden rounded-2xl shadow-md transition-all hover:shadow-xl"
              >
                <img
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={collection.image}
                  alt={collection.name}
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#1a146b]/85 via-[#1a146b]/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 text-white">
                  <h3 className="brand-heading text-2xl font-semibold">
                    {collection.name}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm text-white/90">
                    {collection.copy}
                  </p>
                  <span className="mt-6 inline-flex rounded-full bg-[#006b5f] px-4 py-2 text-sm font-bold">
                    Shop now
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showBrowseSections && (
        <ProductSlider title="New arrivals" category="" />
      )}

      <section id="products" className="bg-[#f6f2fa] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#006b5f]">
                {searchQuery ? "Search results" : "Catalog"}
              </span>
              <h2 className="brand-heading text-4xl font-bold text-[#1a146b]">
                {searchQuery
                  ? `Results for “${searchQuery}”`
                  : selectedCategory || "All products"}
              </h2>
              <p className="mt-2 text-[#474651]">
                Filter by category, price, and sort to find the right item.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#474651] shadow-sm">
              {loading ? "Loading..." : `${total} items found`}
            </span>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl bg-white text-xl font-bold text-[#777682] shadow-sm">
              Loading catalog...
            </div>
          ) : (
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              <aside className="w-full lg:w-1/4 shrink-0">
                <ProductFilters
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={(value) =>
                    updateFilters({ category: value })
                  }
                  minPrice={minPrice}
                  onMinPriceChange={(value) =>
                    updateFilters({ minPrice: value })
                  }
                  maxPrice={maxPrice}
                  onMaxPriceChange={(value) =>
                    updateFilters({ maxPrice: value })
                  }
                  sort={sort}
                  onSortChange={(value) => updateFilters({ sort: value })}
                  onClearFilters={() =>
                    updateFilters({
                      category: "",
                      minPrice: "",
                      maxPrice: "",
                      sort: "",
                      search: searchQuery,
                    })
                  }
                />
              </aside>
              <div className="flex-1">
                {products.length === 0 ? (
                  <div className="flex min-h-72 items-center justify-center rounded-2xl bg-white text-xl font-bold text-[#777682] shadow-sm border border-[#e5e1e9]">
                    No products found matching your search or filters.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
                      {products.map((item) => (
                        <ProductCard
                          key={item._id ?? item.id}
                          product={item}
                        />
                      ))}
                    </div>
                    {pages > 1 && (
                      <div className="mt-10 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => updateFilters({ page: page - 1 })}
                          className="rounded-lg border border-[#c8c5d3] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="px-3 text-sm text-[#474651]">
                          Page {page} of {pages}
                        </span>
                        <button
                          type="button"
                          disabled={page >= pages}
                          onClick={() => updateFilters({ page: page + 1 })}
                          className="rounded-lg border border-[#c8c5d3] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Home;
