import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jelaletdin Charymuhammedow | Frontend Developer Portfolio",
  description:
    "I'm Jelaletdin Charymuhammedow, a frontend developer crafting fast, responsive and creative web experiences using React, Vue, and Next.js.",
  keywords: [
    "Jelaletdin",
    "jelaletdin",
    "Charymuhammedow",
    "Carymuhammedow",
    "Charymuhammedov",
    "Carymuhammedov",
    "Jelaletdin Charymuhammedow",
    "Jelaletdin Carymuhammedow",
    "Jelaletdin Charymuhammedov",
    "frontend developer",
    
    "frontend",
    "developer",
    "web development",
    "web developer",
    "JavaScript",
    "react",
    "vue",
    "Vue.js",
    "React developer",
    "Next.js",
    "portfolio",
    "web developer",
  ],
  authors: [{ name: "Jelaletdin Charymuhammedow" }],
  creator: "Jelaletdin Charymuhammedow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script
        strategy="afterInteractive" // Script'in sayfa yüklendikten sonra çalışmasını sağlar
        src="https://www.googletagmanager.com/gtag/js?id=G-RWZF4GCSSB"
      />

      {/* 2. Kısım: dataLayer ve config kodu */}
      <Script
        id="google-analytics-script" // Bir ID verin
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RWZF4GCSSB');
          `,
        }}
      />
      <body
        className={`${inter.variable} font-inter antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
