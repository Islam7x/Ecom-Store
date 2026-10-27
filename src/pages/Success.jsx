import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Success = () => {
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear the local cart — stock reduction is handled server-side
    // by the Stripe webhook (checkout.session.completed)
    clearCart();
  }, [clearCart]);

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
      <div className="w-24 h-24 bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-5xl mb-6 animate-bounce">
        ✓
      </div>
      <h1 className="text-5xl font-black text-gray-900 dark:text-gray-50 mb-4">
        Payment Received!
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 max-w-md">
        Your order has been placed successfully. You will receive a confirmation
        shortly.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          to="/orders"
          className="bg-[#1a146b] text-white px-10 py-4 rounded-2xl font-bold hover:bg-[#13104f] transition-all shadow-xl"
        >
          View orders
        </Link>
        <Link
          to="/"
          className="border border-[#1a146b] text-[#1a146b] px-10 py-4 rounded-2xl font-bold hover:bg-[#f6f2fa] transition-all"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
};

export default Success;
