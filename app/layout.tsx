import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AruUFoReal",
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
        <link
          rel="preload"
          href="/wordmark.svg"
          as="image"
          type="image/svg+xml"
        />
        <link
          rel="preload"
          href="/aruufar.svg"
          as="image"
          type="image/svg+xml"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: "document.addEventListener('contextmenu',function(e){e.preventDefault();},true);",
          }}
        />
      </head>

      <body className="flex h-dvh min-h-[36rem] flex-col overflow-hidden bg-background text-foreground">
        <SiteHeader />

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
