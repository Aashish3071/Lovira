import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { MeProvider } from "@/lib/me";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lovira — verified dating",
  description: "Dating for everyone, with only verified profiles. Passes from ₹29 a day.",
  appleWebApp: { capable: true, title: "Lovira", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        <MeProvider>{children}</MeProvider>
      </body>
    </html>
  );
}
