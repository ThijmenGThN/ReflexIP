import "@/styles/globals.css"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ByteZero GEO",
  description: "A GEOIP service comparison utility."
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
