import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Электронная очередь",
  description: "Запись на автомойку",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}