import "./globals.css";

export const metadata = { title: "Reisekosten", description: "Digitale Reisekostenabrechnung" };
export const viewport = { width: "device-width", initialScale: 1 };

// Setzt das Theme vor dem ersten Rendern (gespeicherte Wahl, sonst Systemeinstellung)
const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
