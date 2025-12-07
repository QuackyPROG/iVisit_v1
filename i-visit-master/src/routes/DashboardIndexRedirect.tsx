// src/routes/DashboardIndexRedirect.tsx
import { Navigate } from "react-router-dom";
import { useCookies } from "react-cookie";

export default function DashboardIndexRedirect() {
  const [cookies] = useCookies(["role"]);
  const role = cookies.role as "admin" | "guard" | "support" | undefined;

  //this helps redirect them to their respective flows
  if (role === "guard") {
    return <Navigate to="/dashboard/log-visitor" replace />;
  }
  if (role === "support") {
    return <Navigate to="/dashboard/activity-logs" replace />;
  }
  if (role === "admin") {
    return <Navigate to="/dashboard/visitors" replace />;
  }

  return <Navigate to="/dashboard/activity-logs" replace />;
}
