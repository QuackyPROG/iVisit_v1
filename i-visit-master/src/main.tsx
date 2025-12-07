// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CookiesProvider } from "react-cookie";
import "./index.css";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import SignIn from "./pages/SignIn/SIgnIn.tsx";
import NotFound from "./pages/Errors/NotFound.tsx";
import TwoFactorSetup from "./pages/TwoFactor/TwoFactorSetup";
import TwoFactorVerify from "./pages/TwoFactor/TwoFactorVerify";
import VerifyEmail from "./pages/Auth/VerifyEmail.tsx";
import dashboardRoutes from "./routes/DashboardRoutes.tsx";
import ProtectedRoute from "./routes/ProtectedRoute.tsx";
import DashboardIndexRedirect from "./routes/DashboardIndexRedirect.tsx";
import { ToastProvider } from "./contexts/ToastContext.tsx";
import { RfidPollingProvider } from "./features/rfid/RfidPollingContext";

const router = createBrowserRouter([
  { path: "/", element: <SignIn /> },
  { path: "/sign-in", element: <SignIn /> },
  { path: "/verify-email", element: <VerifyEmail /> },
  { path: "/two-factor/setup", element: <TwoFactorSetup /> },
  { path: "/two-factor/verify", element: <TwoFactorVerify /> },
  {
    path: "/dashboard/",
    children: [
      // redirect
      { index: true, element: <DashboardIndexRedirect /> },

      // Wrap each dashboard route with ProtectedRoute
      ...dashboardRoutes.map((route) => ({
        path: route.path,
        element: (
          <ProtectedRoute allowedRoles={route.type}>
            {route.element}
          </ProtectedRoute>
        ),
      })),
    ],
  },
  { path: "*", element: <NotFound /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RfidPollingProvider>
      <ToastProvider>
        <CookiesProvider>
          <RouterProvider router={router} />
        </CookiesProvider>
      </ToastProvider>
    </RfidPollingProvider>
  </StrictMode>
);
