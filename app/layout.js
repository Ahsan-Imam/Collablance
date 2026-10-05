import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import CookieConsent from "@/components/CookieConsent/CookieConsent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "CollabLance — Freelancer Collectives, Better Together",
  description:
    "Form freelancer collectives, pitch clients together, and split payments automatically. India's platform for collaborative freelancing.",
  keywords: [
    "freelancer",
    "collective",
    "collaboration",
    "India",
    "freelancing platform",
    "team freelancing",
  ],
  openGraph: {
    title: "CollabLance — Freelancer Collectives, Better Together",
    description:
      "Form freelancer collectives, pitch clients together, and split payments automatically.",
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
      </body>
    </html>
  );
}
