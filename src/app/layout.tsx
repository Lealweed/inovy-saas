import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inovy — Plataforma de Gestão de Encomendas",
  description: "Sistema profissional para gerenciamento de transporte e encomendas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
