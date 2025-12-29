import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Music Charts - Discover & Vote on Tracks",
  description: "Vote on your favorite tracks and see them climb the charts. Discover new music across Hip Hop, EDM, Rock, and more.",
  keywords: ["music", "charts", "voting", "discovery", "leaderboard"],
  openGraph: {
    title: "Music Charts",
    description: "Vote on tracks and watch them climb the charts",
    type: "website",
  },
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en bg-black">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-TV76C1GVG4"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TV76C1GVG4');
          `}
        </Script>
        <Navbar />
        <main className="pt-20 bg-zinc-950 flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
