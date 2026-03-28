import { Geist_Mono, Inter } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Giraf",
  description: "GitHub issue aggregator",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <SessionProvider>
          <QueryProvider>
            <ThemeProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
