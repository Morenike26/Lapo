import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Lapo — On-Chain Credit on Arc",
  description:
    "A permissionless USDC lending pool on Arc Testnet. Lenders earn 90% of all interest. Borrowers build an on-chain credit score and unlock progressive credit lines.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Lapo — On-Chain Credit on Arc",
    description:
      "A permissionless USDC lending pool on Arc Testnet. Lenders earn 90% of all interest. Borrowers build an on-chain credit score and unlock progressive credit lines.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lapo — On-Chain Credit on Arc",
    description:
      "A permissionless USDC lending pool on Arc Testnet. Lenders earn 90% of all interest. Borrowers build an on-chain credit score and unlock progressive credit lines.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-lapo-dark text-white antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
