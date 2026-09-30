import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Futuristic lettering for the Neon look's title.
const orbitron = Orbitron({
  variable: "--font-orbitron",
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
// New visitors get the Neon look in dark mode.
const themeScript = `try{var d=document.documentElement,t=localStorage.getItem("mess-theme");if(t!=="light")d.classList.add("dark");var l=localStorage.getItem("mess-look");d.setAttribute("data-look",l==="classic"||l==="chalk"||l==="blueprint"?l:"neon")}catch(e){d.classList.add("dark");d.setAttribute("data-look","neon")}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${orbitron.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
