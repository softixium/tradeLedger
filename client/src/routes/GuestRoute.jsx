import { Navigate, Outlet } from "react-router-dom";

const GuestRoute = () => {
  const user = localStorage.getItem("user");

  return !user ? <Outlet /> : <Navigate to="/" replace />;
};

export default GuestRoute;
