import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "African Nations League",
  description: "Tournament simulation platform for African Nations League",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}

