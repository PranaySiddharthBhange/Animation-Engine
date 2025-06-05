import { useState } from "react";

export function useSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  return { sidebarOpen, setSidebarOpen, toggleSidebar };
}