/** Map URL slugs to backend product category names */
export const SLUG_TO_CATEGORY = {
  electronics: "Electronics",
  fashion: "Fashion",
  grocery: "Grocery",
  "beauty-fragrance": "Beauty & Fragrance",
  "home-appliances": "Home & Appliances",
  baby: "Baby",
  "toys-games": "Toys & Games",
  "sports-outdoors": "Sports & Outdoors",
  "stationary-books": "Stationary & Books",
};

export const STORE_CATEGORIES = [
  {
    slug: "electronics",
    name: "Electronics",
    copy: "Phones, audio, laptops, and everyday gadgets.",
    image:
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "fashion",
    name: "Fashion",
    copy: "Seasonal looks and everyday wardrobe staples.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "home-appliances",
    name: "Home & Appliances",
    copy: "Kitchen, living, and home upgrades that last.",
    image:
      "https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "grocery",
    name: "Grocery",
    copy: "Pantry essentials delivered to your door.",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "beauty-fragrance",
    name: "Beauty & Fragrance",
    copy: "Skincare, makeup, and signature scents.",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "baby",
    name: "Baby",
    copy: "Care products and gear for little ones.",
    image:
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "toys-games",
    name: "Toys & Games",
    copy: "Playtime picks for kids and families.",
    image:
      "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "sports-outdoors",
    name: "Sports & Outdoors",
    copy: "Fitness, outdoor gear, and activewear.",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
  },
  {
    slug: "stationary-books",
    name: "Stationary & Books",
    copy: "Notebooks, desks supplies, and reading.",
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
  },
];

export const slugToCategory = (slug) => SLUG_TO_CATEGORY[slug] ?? null;

export const categoryToSlug = (category = "") =>
  category.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");

export const CATEGORY_TITLES = Object.fromEntries(
  STORE_CATEGORIES.map((category) => [category.slug, category.name]),
);
