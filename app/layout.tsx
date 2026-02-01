import type { Metadata, Viewport } from "next"
import { Poppins, Inter } from "next/font/google"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Catala Correcte - Aprendre catala amb quizzes",
  description: "Aplicacio per aprendre catala correcte amb quizzes de barbarismes i dialectes catalans",
}

export const viewport: Viewport = {
  themeColor: "#C8102E",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ca">
      <body className={`${poppins.variable} ${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
