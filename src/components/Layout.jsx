import React, { useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/AuthContext";
import { canAccessRoute, homeRouteForRole } from "@/lib/permissions";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Guarda de rota: redireciona perfis sem acesso à funcionalidade
  if (user && !canAccessRoute(user, location.pathname)) {
    return <Navigate to={homeRouteForRole(user.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-[260px]">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6 max-w-[1500px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}