import "./globals.css";
import { Spectral, Hanken_Grotesk } from "next/font/google";

const spectral = Spectral({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-spectral" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken" });

export const metadata = {
  title: "ParkPulse — National Parks of the USA",
  description: "Explore all 63 U.S. national parks on an interactive 3D globe with live weather and conditions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spectral.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
