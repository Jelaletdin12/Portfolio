import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jelaletdin Charymuhammedow | Frontend Developer Portfolio",
  description: "I'm Jelaletdin Charymuhammedow, a frontend developer crafting fast, responsive and creative web experiences using React, Vue, and Next.js.",
  keywords: ["Jelaletdin", "Charymuhammedow", "frontend developer", "React developer", "Next.js", "portfolio", "web developer"],
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
      <body className={`${inter.variable} font-inter antialiased bg-background text-foreground overflow-x-hidden`}>
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