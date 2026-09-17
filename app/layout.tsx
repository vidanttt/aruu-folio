import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARUU for REAL",
  description: "Portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://use.typekit.net/fuu4myv.css"
        />
      </head>

      <body className="flex h-dvh min-h-[36rem] flex-col overflow-hidden bg-background text-foreground">
        <header className="flex h-[clamp(3.25rem,8vh,4.7rem)] shrink-0 items-center justify-center border-b border-foreground bg-background z-50">
          <Link href="/">
            <img
              src="/wordmark.svg"
              alt="ARUU for REAL"
              className="h-[29px] w-auto object-contain transition-opacity hover:opacity-80"
              style={{ filter: "brightness(0)" }}
            />
          </Link>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}