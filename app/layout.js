import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import CookieConsent from "@/components/CookieConsent/CookieConsent";
import Analytics from "@/components/Analytics/Analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://collablance.vercel.app'),
  title: "CollabLance — Freelancer Teams, Better Together",
  description:
    "Form freelancer teams, pitch clients together, and agree payment splits before work starts. India's platform for collaborative freelancing.",
  keywords: [
    "freelancer",
    "team",
    "collaboration",
    "India",
    "freelancing platform",
    "team freelancing",
  ],
  openGraph: {
    title: "CollabLance — Freelancer Teams, Better Together",
    description:
      "Form freelancer teams, pitch clients together, and agree payment splits before work starts.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Navbar />
        <main style={{ paddingTop: "4rem" }}>{children}</main>
        <Footer />
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
