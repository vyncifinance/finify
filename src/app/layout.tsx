import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "Finify — Gestão Patrimonial Familiar",
  description: "Organize seu patrimônio, acompanhe seus objetivos e construa um futuro financeiro sólido.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
