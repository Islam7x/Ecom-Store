import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import HorizontalScroller from "./HorizontalScroller";
import { API } from "../lib/api";
import { parseProductsResponse } from "../lib/products";
import { categoryToSlug } from "../lib/categories";

const ProductSlider = ({ title, category }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await API.get("/products", {
          params: {
            limit: 10,
            page: 1,
            ...(category ? { category } : { sort: "newest" }),
          },
        });
        setProducts(parseProductsResponse(data).products.slice(0, 10));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-4xl font-black italic tracking-widest text-[#1b1b21] uppercase">
          {title}
        </h2>
        <Link
          to={
            category
              ? `/category/${categoryToSlug(category)}`
              : "/products?sort=newest"
          }
          className="bg-black text-white px-8 py-3 rounded-lg font-bold uppercase text-sm tracking-widest hover:bg-gray-800 transition"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[#777682] shadow-sm border border-[#e5e1e9]">
          Loading Products...
        </div>
      ) : (
        <HorizontalScroller
          ariaLabel={`${title} products`}
          contentClassName="flex gap-6 pt-2"
        >
          {products.map((item) => (
            <div
              key={item._id ?? item.id}
              className="min-w-[280px] max-w-[280px] shrink-0"
            >
              <ProductCard product={item} />
            </div>
          ))}
          {products.length === 0 && (
            <div className="flex w-full h-72 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[#777682] shadow-sm border border-[#e5e1e9]">
              No products available in this category.
            </div>
          )}
        </HorizontalScroller>
      )}
    </div>
  );
};

export default ProductSlider;
