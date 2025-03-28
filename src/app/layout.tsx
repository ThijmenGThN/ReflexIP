import "@/styles/globals.css"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nantric | Compare IP Databases with Ease",
  description: "Quickly compare IP lookup results across top IP databases. Discover accuracy, consistency, and insights with Nantric's streamlined IP comparison tool.",
  openGraph: {
    type: "website",
    url: "http://reflex.nantric.net/",
    title: "Nantric | Compare IP Databases with Ease",
    description: "Quickly compare IP lookup results across top IP databases. Discover accuracy, consistency, and insights with Nantric's streamlined IP comparison tool.",
    images: [
      {
        url: "https://raw.githubusercontent.com/ThijmenGThN/ReflexIP/refs/heads/main/src/assets/preview.png",
        alt: "Nantric Meta Image",
      },
    ],
  },
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
