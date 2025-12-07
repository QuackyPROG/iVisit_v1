// src/routes/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useCookies } from "react-cookie";

type Role = "admin" | "guard" | "support";

interface ProtectedRouteProps {
  allowedRoles?: Role[];  // if omitted, any logged-in role is allowed
  children: React.ReactNode;
}

export default function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const [cookies] = useCookies(["role"]);
  const role = cookies.role as Role | undefined;
  const location = useLocation();

  // Not logged in at all -> send to sign-in
  if (!role) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Logged in, but role not allowed for this route
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // You can send them to a 403 page if you have one
    return <Navigate to="/dashboard/activity-logs" replace />;
  }

  // Authorized
  return children;
}
