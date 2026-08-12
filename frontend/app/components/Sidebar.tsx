// frontend/app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UploadCloud, CheckSquare, Layers, Settings, Database } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Upload Catalog", href: "/", icon: UploadCloud },
    { name: "Pending Metadata", href: "/metadata", icon: CheckSquare },
    { name: "Product Catalog", href: "/catalog", icon: Layers },
    { name: "Master Management", href: "/management", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shadow-sm z-50">
      {/* App Logo / Brand Header */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-brand-dark flex items-center">
          <Database className="w-6 h-6 mr-2 text-brand-blue" />
          JewelryOS
        </h1>
        <p className="text-xs text-gray-400 mt-1">Catalog Ingestion & Inventory</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? "bg-brand-blue text-white shadow-md shadow-blue-500/20"
                  : "text-gray-600 hover:bg-brand-light hover:text-brand-dark"
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-white" : "text-gray-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Workspace Status Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-brand-light p-3 rounded-xl border border-gray-100 text-xs text-gray-500">
          <p className="font-bold text-brand-dark">Workspace Active</p>
          <p className="mt-0.5 text-emerald-600 font-medium">● PostgreSQL Connected</p>
        </div>
      </div>
    </aside>
  );
}