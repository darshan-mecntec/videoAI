import "./globals.css";
import AppShell from "./components/app-shell";
import { AuthProvider } from "./components/auth-provider";

export const metadata = {
  title: "Aether Studio — AI-Native Creative Suite",
  description: "Create photorealistic images, 1080p videos with native audio, and custom voice narration with Aether Studio from text prompts or references.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#0f1113] text-zinc-100 antialiased min-h-screen flex flex-col font-sans selection:bg-purple-500 selection:text-white">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
