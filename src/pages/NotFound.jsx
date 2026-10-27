import { Link } from "react-router-dom";

const NotFound = () => (
  <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#006b5f]">
      404
    </p>
    <h1 className="brand-heading text-4xl font-bold text-[#1a146b] mb-4">
      Page not found
    </h1>
    <p className="text-[#474651] mb-8">
      That link does not match a product, category, or account page.
    </p>
    <Link
      to="/"
      className="rounded-lg bg-[#1a146b] px-6 py-3 text-sm font-bold text-white hover:bg-[#13104f]"
    >
      Back to store
    </Link>
  </main>
);

export default NotFound;
