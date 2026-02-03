import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, DM_Mono, IM_Fell_English_SC } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@/lib/auth";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const imFellEnglish = IM_Fell_English_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-im-fell-english",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Professor Gosse's Peculiar Breakdown & Scheduling Site",
  description: "Film production breakdown sheets and strip board scheduling",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} ${imFellEnglish.variable} font-sans antialiased bg-stone-950 text-stone-100`}
      >
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
