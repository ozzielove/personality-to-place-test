import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

const DESCRIPTION =
  "A 563-question personality test that ends with the U.S. city, ZIP code, and neighborhood where your personality fits best. Saves as you go and scores instantly.";

export const metadata: Metadata = {
  metadataBase: new URL("https://personality-to-place-test.vercel.app"),
  title: "The Personality-to-Place Inventory",
  description: DESCRIPTION,
  openGraph: { title: "The Personality-to-Place Inventory", description: DESCRIPTION, type: "website", url: "/" },
  twitter: { card: "summary", title: "The Personality-to-Place Inventory", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#111815" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
