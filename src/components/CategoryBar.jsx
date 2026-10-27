import { useState } from "react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import { STORE_CATEGORIES } from "../lib/categories";

const CategoryBar = () => {
  const categories = STORE_CATEGORIES;

  const [hoveredIndex, setHoveredIndex] = useState(null);

  const getScale = (index) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.2;
    return 1;
  };

  return (
    <div className="bg-[#001a4d] border-b border-[#001a4d] sticky top-20 z-40 overflow-visible">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 overflow-visible">
        <HorizontalScroller
          ariaLabel="Store categories"
          contentClassName="flex items-center gap-6 px-4 py-3"
        >
          {categories.map((category, index) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                transform: `scale(${getScale(index)})`,
                transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transformOrigin: index === 0 ? "left center" : "center center",
              }}
              className="whitespace-nowrap text-sm font-semibold text-white hover:text-yellow-300 hover:underline transition-colors block"
            >
              {category.name}
            </Link>
          ))}
        </HorizontalScroller>
      </div>
    </div>
  );
};

export default CategoryBar;
