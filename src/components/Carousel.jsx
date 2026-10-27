import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const slides = [
  {
    id: 1,
    title: "All your essentials",
    subtitle: "in one place",
    tagline: "Free shipping on qualifying orders",
    href: "/products",
    image: "/images/essentials.jpg",
    textColor: "text-white",
  },
  {
    id: 2,
    title: "Everyday fashion",
    subtitle: "New season picks",
    tagline: "Shop apparel and accessories",
    href: "/category/fashion",
    bgHex: "#806d5e",
    bgPosition: "80% center",
    image: "/images/fashion.png",
    textColor: "text-white",
  },
  {
    id: 3,
    title: "Top picks in",
    subtitle: "Electronics",
    tagline: "Phones, audio, and more",
    href: "/category/electronics",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=600&fit=crop",
    textColor: "text-white",
  },
  {
    id: 4,
    title: "Home upgrades",
    subtitle: "that actually last",
    tagline: "Kitchen and living essentials",
    href: "/category/home-appliances",
    image:
      "https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=1200&h=600&fit=crop",
    textColor: "text-white",
  },
];

const Carousel = () => {

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full overflow-hidden bg-gray-100">
      {/* Slides Container */}
      <div className="relative h-64 sm:h-80 md:h-96">
        {slides.map((s, index) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            style={
              s.image
                ? {
                    backgroundImage: `url(${s.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: s.bgPosition ? s.bgPosition : "center",
                    backgroundRepeat: "no-repeat",
                    ...(s.bgHex ? { backgroundColor: s.bgHex } : {}),
                  }
                : s.bgHex
                  ? { backgroundColor: s.bgHex }
                  : undefined
            }
          >
            {/* Left gradient for text readability when image is used (inline style to avoid Tailwind warnings) */}
            {s.image && (
              <div
                className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(180,120,255,0.95) 0%, rgba(180,120,255,0.7) 30%, rgba(180,120,255,0) 100%)",
                }}
              />
            )}

            {/* Content Container */}
            <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 flex items-center">
              <div className="flex-1">
                <h2
                  className={`text-4xl sm:text-5xl font-bold ${s.textColor} leading-tight`}
                >
                  {s.title}
                </h2>
                <p
                  className={`text-3xl sm:text-4xl font-bold ${s.textColor} mt-2`}
                >
                  {s.subtitle}
                </p>
                {s.tagline && (
                  <p
                    className={`text-xl sm:text-2xl font-semibold ${s.textColor} mt-3`}
                  >
                    {s.tagline}
                  </p>
                )}
                {s.href && (
                  <Link
                    to={s.href}
                    className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-[#1a146b]"
                  >
                    Shop this collection
                  </Link>
                )}
              </div>

              {/* Right side placeholder (kept for semantic layout; image is background) */}
              <div className="flex-1 hidden sm:flex items-center justify-end" />
            </div>
          </div>
        ))}

        {/* Left Arrow */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/60 rounded-full p-2 transition-all group"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/60 rounded-full p-2 transition-all"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6 text-gray-800" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-3 py-4 bg-gray-50">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all rounded-full ${
              index === currentSlide
                ? "bg-orange-500 w-3 h-3"
                : "bg-gray-300 w-2 h-2 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
