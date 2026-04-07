import type { Metadata } from "next";
import ConfiguracoesClient from "./ConfiguracoesClient";

export const metadata: Metadata = {
  title: "Configurações | Inovy",
};

export default function ConfiguracoesPage() {
  return <ConfiguracoesClient />;
}
