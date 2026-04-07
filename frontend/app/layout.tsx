import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "ProLedger",
  description: "Professional accounting system foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f3f4f6" }}>
        {children}
      </body>
    </html>
  );
}
