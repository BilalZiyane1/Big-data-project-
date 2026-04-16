import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Loader from "./components/common/Loader";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AdminRoute from "./components/common/AdminRoute";
import CustomerRoute from "./components/common/CustomerRoute";
import TelemetryTracker from "./components/common/TelemetryTracker";

const HomePage = lazy(() => import("./pages/shop/HomePage"));
const ProductsPage = lazy(() => import("./pages/shop/ProductsPage"));
const ProductDetailsPage = lazy(() => import("./pages/shop/ProductDetailsPage"));
const CartPage = lazy(() => import("./pages/shop/CartPage"));
const CheckoutPage = lazy(() => import("./pages/shop/CheckoutPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ProfilePage = lazy(() => import("./pages/shop/ProfilePage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));

const App = () => {
  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <TelemetryTracker />
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        <Suspense fallback={<Loader fullPage />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route
              path="/cart"
              element={
                <CustomerRoute>
                  <CartPage />
                </CustomerRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CustomerRoute>
                    <CheckoutPage />
                  </CustomerRoute>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <CustomerRoute>
                    <ProfilePage />
                  </CustomerRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default App;
