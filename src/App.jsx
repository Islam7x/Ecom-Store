import "./index.css";
import Navbar from "./components/Navbar";
import CategoryBar from "./components/CategoryBar";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import NotificationClearer from "./components/NotificationClearer";
import { NotificationProvider } from "./context/NotificationContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Success from "./pages/Success";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Order from "./pages/Order";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
import CategoryPage from "./pages/CategoryPage";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import { useEffect, useState } from "react";
import { API } from "./lib/api";

function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await API.get("/auth/me");
        setIsAdmin(Boolean(response.data?.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[#474651]">
        Checking admin access...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col bg-[#fcf8ff] text-[#1b1b21]">
      <NotificationClearer />
      <Toast />
      {!isAdminRoute && (
        <>
          <Navbar />
          <CategoryBar />
        </>
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/success" element={<Success />} />
          <Route path="/orders" element={<Order />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/help/:slug" element={<Help />} />
          <Route path="/help" element={<Navigate to="/help/faq" replace />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminRoute>
                <AdminProducts />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <Router>
        <AppContent />
      </Router>
    </NotificationProvider>
  );
}

export default App;
