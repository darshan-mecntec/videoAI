'use client';

import { useState } from 'react';
import TopNav from './top-nav';
import Sidebar from './sidebar';

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
