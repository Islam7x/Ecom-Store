import { Link, Navigate, useParams } from "react-router-dom";

const PAGES = {
  about: {
    title: "About LUXE",
    body: [
      "LUXE is a multi-category storefront for electronics, fashion, grocery, home, and more.",
      "Prices are confirmed on the server at checkout, inventory is reserved when checkout starts, and orders stay in your account after Stripe confirms payment.",
    ],
  },
  contact: {
    title: "Contact us",
    body: [
      "Email support@luxe.store for order questions, returns, or account help.",
      "Include your order ID from the Orders page so we can look up the shipment quickly.",
    ],
  },
  faq: {
    title: "Frequently asked questions",
    body: [
      "Do I need an account to checkout? Yes. Sign in or create an account so we can attach the order and send updates.",
      "When is shipping free? Free shipping starts at the threshold shown for your selected delivery area.",
      "Can I save items for later? Use the heart icon to add products to your wishlist. The list is stored in this browser.",
    ],
  },
  shipping: {
    title: "Shipping",
    body: [
      "Delivery estimates depend on the city you select in the header. Most metro areas arrive in 1–4 business days.",
      "Shipping is calculated at checkout from the live cart subtotal and your delivery location.",
    ],
  },
  returns: {
    title: "Returns",
    body: [
      "Most unused items can be returned within 30 days of delivery.",
      "Grocery and personal-care items may be final sale. Contact support with your order ID to start a return.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      "We store your account email, saved addresses, and order history to fulfill purchases.",
      "Payment details are processed by Stripe. We do not store full card numbers on our servers.",
    ],
  },
  terms: {
    title: "Terms of service",
    body: [
      "By placing an order you agree that prices, tax, and stock are confirmed at checkout.",
      "We may cancel orders that cannot be fulfilled due to inventory, payment, or address issues.",
    ],
  },
};

const Help = () => {
  const { slug } = useParams();
  const page = PAGES[slug];

  if (!page) {
    return <Navigate to="/help/faq" replace />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#006b5f]">
        Help Center
      </p>
      <h1 className="brand-heading text-4xl font-bold text-[#1a146b] mb-6">
        {page.title}
      </h1>
      <div className="space-y-4 text-[#474651] leading-relaxed">
        {page.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
        {Object.keys(PAGES).map((key) => (
          <Link
            key={key}
            to={`/help/${key}`}
            className={
              key === slug ? "text-[#1a146b]" : "text-[#006b5f] hover:underline"
            }
          >
            {PAGES[key].title}
          </Link>
        ))}
      </div>
    </main>
  );
};

export default Help;
