import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className="w-full h-full" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans w-full min-h-full`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
