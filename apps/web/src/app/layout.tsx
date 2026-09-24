import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { DemoScenarioBar } from "../components/DemoScenarioBar";

export const metadata: Metadata = {
  title: "Paytm TaskMate - AI Financial Teammate",
  description:
    "AI financial teammate that owns the workflow while the user keeps control of the money.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#f4f7fb] text-slate-900 pb-16 md:pb-0">
        <DemoScenarioBar />
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
