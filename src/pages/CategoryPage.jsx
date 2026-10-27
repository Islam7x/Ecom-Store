import { useState } from "react";
import { useParams } from "react-router-dom";
import SubcategoryGrid from "../components/SubcategoryGrid";
import ElectronicsCarousel from "../components/ElectronicsCarousel";
import FashionCarousel from "../components/FashionCarousel";
import BeautyCarousel from "../components/BeautyCarousel";
import HomeCarousel from "../components/HomeCarousel";
import BabyCarousel from "../components/BabyCarousel";
import ToysCarousel from "../components/ToysCarousel";
import SportsCarousel from "../components/SportsCarousel";
import GroceryCarousel from "../components/GroceryCarousel";
import StationaryBooksCarousel from "../components/StationaryBooksCarousel";
import CategoryProducts from "../components/CategoryProducts";
import HorizontalScroller from "../components/HorizontalScroller";
import { CATEGORY_TITLES, slugToCategory } from "../lib/categories";

// UI metadata for tabs and subcategory grids (not product data)
import {
  fashionTabs,
  fashionSubcategories,
  beautyTabs,
  beautySubcategories,
  homeTabs,
  homeSubcategories,
  babyTabs,
  babySubcategories,
  toysTabs,
  toysSubcategories,
  sportsTabs,
  sportsSubcategories,
} from "../data/products";

const CategorySubNav = ({ tabs, activeTab, setActiveTab }) => (
  <div className="bg-white border-b border-[#e5e1e9]">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <HorizontalScroller
        ariaLabel="Category tabs"
        contentClassName="flex items-center gap-2 py-4"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab && setActiveTab(i)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              activeTab === i || (activeTab === undefined && i === 0)
                ? "bg-[#e5e8f0] text-[#1a146b] border border-[#d0d3db]"
                : "bg-[#f6f2fa] text-[#474651] border border-transparent hover:bg-[#e5e8f0]"
            }`}
          >
            {tab}
          </button>
        ))}
      </HorizontalScroller>
    </div>
  </div>
);

const CategorySubcategoryGrid = ({ subcategories }) => (
  <div className="bg-gradient-to-r from-[#e3eef8] via-[#f7e3e7] to-[#fae5e6]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-y-10 gap-x-2">
        {subcategories.map((sub, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 cursor-pointer group"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transition-transform group-hover:-translate-y-2 rounded-full overflow-hidden bg-white shadow-sm border border-white/40 p-2">
              <img
                src={sub.img}
                alt={sub.name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-center text-gray-800 leading-tight">
              {sub.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CategoryPage = () => {
  const { id } = useParams();
  const [tabState, setTabState] = useState({ id, activeTab: 0 });
  const activeTab = tabState.id === id ? tabState.activeTab : 0;
  const setActiveTab = (nextTab) => setTabState({ id, activeTab: nextTab });
  const categoryName = slugToCategory(id);
  const displayTitle = CATEGORY_TITLES[id] ?? id;

  return (
    <div className="bg-[#fcf8ff]">
      {/* Category Sub-navs */}
      {id === "electronics" && (
        <CategorySubNav
          tabs={[
            "Electronics",
            "Mobiles",
            "Headsets",
            "Wearables",
            "Accessories",
            "Laptops",
            "Laptop Accessories",
            "Gaming",
            "TVs",
            "Cameras",
            "Appliances",
          ]}
        />
      )}
      {id === "grocery" && (
        <CategorySubNav
          tabs={[
            "All Groceries",
            "Grains & Cereals",
            "Spices & Seasonings",
            "Oils & Condiments",
            "Healthy Foods",
            "Beverages",
            "Baking Essentials",
            "Organic Products",
          ]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
      {id === "fashion" && (
        <CategorySubNav
          tabs={fashionTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
      {id === "beauty-fragrance" && (
        <CategorySubNav
          tabs={beautyTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
      {id === "home-appliances" && (
        <CategorySubNav
          tabs={homeTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
      {id === "baby" && (
        <CategorySubNav
          tabs={babyTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
      {id === "toys-games" && (
        <CategorySubNav
          tabs={toysTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
      {id === "sports-outdoors" && (
        <CategorySubNav
          tabs={sportsTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Hero Carousel Area */}
      {id === "electronics" && <ElectronicsCarousel />}
      {id === "fashion" && <FashionCarousel />}
      {id === "beauty-fragrance" && <BeautyCarousel />}
      {id === "home-appliances" && <HomeCarousel />}
      {id === "baby" && <BabyCarousel />}
      {id === "toys-games" && <ToysCarousel />}
      {id === "sports-outdoors" && <SportsCarousel />}
      {id === "grocery" && <GroceryCarousel />}

      {/* Stationary Books Carousel */}
      {id === "stationary-books" && (
        <div className="flex justify-center py-12 bg-white">
          <StationaryBooksCarousel />
        </div>
      )}

      {/* Subcategory Grids */}
      {id === "electronics" && <SubcategoryGrid />}
      {id === "fashion" && (
        <CategorySubcategoryGrid subcategories={fashionSubcategories} />
      )}
      {id === "beauty-fragrance" && (
        <CategorySubcategoryGrid subcategories={beautySubcategories} />
      )}
      {id === "home-appliances" && (
        <CategorySubcategoryGrid subcategories={homeSubcategories} />
      )}
      {id === "baby" && (
        <CategorySubcategoryGrid subcategories={babySubcategories} />
      )}
      {id === "toys-games" && (
        <CategorySubcategoryGrid subcategories={toysSubcategories} />
      )}
      {id === "sports-outdoors" && (
        <CategorySubcategoryGrid subcategories={sportsSubcategories} />
      )}

      {/* Product listings from backend API */}
      {categoryName ? (
        <CategoryProducts
          category={categoryName}
          title={displayTitle}
          layout={id === "stationary-books" ? "grid" : "sections"}
        />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 text-center">
          <h2 className="text-3xl font-bold mb-4">{displayTitle}</h2>
          <p className="text-xl text-gray-500">
            Products coming soon in this category!
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
