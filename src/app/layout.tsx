import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Handwriting for the Chalkboard look's title and headings.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mess: maths + chess",
  description: "Chess where every piece is a square root, and it moves along the triangle whose hypotenuse it is.",
};

// Applies the saved light/dark theme and look before the page paints, so nothing flashes.
const themeScript = `try{var d=document.documentElement,t=localStorage.getItem("mess-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");var l=localStorage.getItem("mess-look");if(l==="chalk"||l==="blueprint")d.setAttribute("data-look",l)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
