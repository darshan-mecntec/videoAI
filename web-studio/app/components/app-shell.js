'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import TopNav from './top-nav';
import Sidebar from './sidebar';

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const isAdminPortal = pathname?.startsWith('/admin');

  if (isAdminPortal) {
    return (
      <div className="min-h-screen bg-[#07080a] text-zinc-100 font-sans selection:bg-purple-500 selection:text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1113] text-zinc-100 font-sans">
      <TopNav
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main
          className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-60'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
