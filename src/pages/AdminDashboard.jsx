// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  AlertCircle,
} from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import StatCard from "../components/admin/StatCard";
import AdminTable from "../components/admin/AdminTable";
import { API } from "../lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await API.get("/admin/dashboard/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(fetchDashboardStats, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  if (loading || !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-500">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Welcome back! Here's your store overview.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.overview.totalOrders}
          bg="bg-blue-50"
          icon-color="text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={`$${stats.overview.totalRevenue.toFixed(2)}`}
          bg="bg-green-50"
          icon-color="text-green-600"
        />
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats.overview.totalProducts}
          bg="bg-purple-50"
          icon-color="text-purple-600"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={stats.overview.totalCustomers}
          bg="bg-orange-50"
          icon-color="text-orange-600"
        />
        <StatCard
          icon={Users}
          label="Admin Users"
          value={stats.overview.totalAdmins}
          bg="bg-red-50"
          icon-color="text-red-600"
        />
      </div>

      {/* Today & Last 30 Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Today's Performance
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-slate-600 text-sm">Orders Today</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.today.orders}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-sm">Revenue Today</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.today.revenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Last 30 Days
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-slate-600 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.last30Days.orders}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.last30Days.revenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Order Status Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.orderStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-slate-600 capitalize">{status}</span>
                <span className="font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {stats.alerts.lowStockProducts > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Low Stock Alert
            </h3>
            <p className="text-slate-600 mb-4">
              {stats.alerts.lowStockProducts} product(s) have low stock levels
            </p>
            <ul className="space-y-2">
              {stats.alerts.lowStockItems.map((item) => (
                <li key={item._id} className="flex justify-between">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-bold text-orange-600">
                    {item.stock} left
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent Orders
          </h3>
        </div>
        <AdminTable
          columns={[
            { key: "orderNumber", label: "Order #" },
            { key: "customer", label: "Customer" },
            { key: "total", label: "Total", render: (v) => `$${v.toFixed(2)}` },
            {
              key: "status",
              label: "Status",
              render: (v) => (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    v === "delivered"
                      ? "bg-green-100 text-green-800"
                      : v === "shipped"
                        ? "bg-blue-100 text-blue-800"
                        : v === "paid"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {v}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "Date",
              render: (v) => new Date(v).toLocaleDateString(),
            },
          ]}
          data={stats.recentOrders}
        />
      </div>
    </AdminLayout>
  );
}
