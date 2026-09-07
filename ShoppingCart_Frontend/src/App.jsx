import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import AdminOrderDetailPage from "./pages/admin/AdminOrderDetailPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AddressesPage from "./pages/AddressesPage";
import ProfilePage from "./pages/ProfilePage";
import GuestCheckoutSuccessPage from "./pages/GuestCheckoutSuccessPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} />
          <Route path="/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/checkout/guest-success" element={<GuestCheckoutSuccessPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>
      </Routes>
    </div>
  );
}