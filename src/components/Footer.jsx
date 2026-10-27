import { createElement } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import amexLogo from "payment-icons/min/flat/amex.svg";
import mastercardLogo from "payment-icons/min/flat/mastercard.svg";
import visaLogo from "payment-icons/min/flat/visa.svg";
import { STORE_CATEGORIES } from "../lib/categories";

const socialLinks = [
  { label: "Facebook", icon: FaFacebookF, url: "https://www.facebook.com" },
  { label: "X", icon: FaXTwitter, url: "https://www.x.com" },
  { label: "Instagram", icon: FaInstagram, url: "https://www.instagram.com" },
  { label: "Email", icon: FaEnvelope, url: "mailto:support@luxe.store" },
];

const paymentMethods = [
  { label: "Visa", logo: visaLogo },
  { label: "Mastercard", logo: mastercardLogo },
  { label: "American Express", logo: amexLogo },
];

const MeezaLogo = () => (
  <span className="relative flex h-9 w-16 items-center justify-center overflow-hidden rounded bg-white">
    <span className="absolute left-1.5 top-1 h-1.5 w-8 rounded-sm bg-[#c51d30]" />
    <span className="absolute right-1.5 top-1 h-1.5 w-5 rounded-sm bg-[#ffcc33]" />
    <span className="text-[15px] font-black italic leading-none text-[#30236f]">
      meeza
    </span>
  </span>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#001a4d] bg-[#001a4d] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">LUXE</h3>
            <p className="text-sm text-gray-300">
              A multi-category marketplace for electronics, fashion, home, and
              everyday essentials. Free shipping on qualifying orders.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">Shop</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              {STORE_CATEGORIES.slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/category/${category.slug}`}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">Help</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/help/contact"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/help/faq"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/help/shipping"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link
                  to="/help/returns"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Returns
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-white">Follow Us</h4>
            <div className="flex gap-4">
              {socialLinks.map(({ label, icon, url }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  {createElement(icon, { size: 20, "aria-hidden": true })}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="my-8 rounded-lg bg-[#001a4d] p-6">
          <h4 className="mb-4 text-center text-sm font-semibold text-white">
            We accept
          </h4>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div
              className="flex h-11 w-20 items-center justify-center rounded bg-white shadow-sm"
              aria-label="Meeza"
              role="img"
            >
              <MeezaLogo />
            </div>
            {paymentMethods.map(({ label, logo }) => (
              <div
                key={label}
                className="flex h-11 w-20 items-center justify-center rounded bg-white px-2 shadow-sm"
                aria-label={label}
                role="img"
              >
                <img
                  src={logo}
                  alt=""
                  className="max-h-8 max-w-16 object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="my-8 border-t border-gray-600"></div>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-300">
            &copy; {currentYear} LUXE. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="/help/privacy"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/help/terms"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
