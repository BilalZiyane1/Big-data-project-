import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Loader from "./Loader";

const CustomerRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) return <Loader fullPage />;

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default CustomerRoute;
