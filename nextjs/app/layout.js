import "./globals.css";
import { Spectral, Hanken_Grotesk } from "next/font/google";

const spectral = Spectral({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-spectral" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken" });

export const metadata = {
  title: "ParkBuddy — Discover, plan & collect the outdoors",
  description: "Discover the best parks and lakes near you, build real-road trips, and collect a digital Trip Passport.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spectral.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
