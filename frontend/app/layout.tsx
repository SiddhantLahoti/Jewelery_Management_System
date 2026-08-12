// frontend/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Jewelry Management System",
  description: "AI-powered jewelry catalog ingestion and management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-brand-light text-brand-dark antialiased">
        <div className="flex h-screen overflow-hidden">
          
          {/* Persistent Left Sidebar */}
          <Sidebar />

          {/* Main Content Area (Scrollable independently) */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}