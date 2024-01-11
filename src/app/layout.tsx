import "~/styles/globals.css";

import { TRPCReactProvider } from "~/trpc/react";
import { Happy_Monkey } from "next/font/google";
import { cookies } from "next/headers";

const fontSans = Happy_Monkey({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: "400",
});

export const metadata = {
  title: "Chimpin",
  description:
    "Discover Chimpin, where artificial intelligence revolutionizes party gaming! Step into a vibrant realm of AI-enhanced games that offer a fresh and exciting twist to your gaming experience. With Chimpin, every session is a new adventure thanks to our cutting-edge AI that tailors content and challenges to your group's style and preferences. Whether it's a family game night, a virtual hangout with friends, or a fun-filled break, Chimpin is your ideal choice for interactive and engaging entertainment. Our platform boasts a diverse array of games that are easy to access and play from any device, no app download necessary. Prepare for laughs, surprises, and unforgettable moments with Chimpin – where AI brings your gaming experience to life!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${fontSans.variable}`}>
        <TRPCReactProvider cookies={cookies().toString()}>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
