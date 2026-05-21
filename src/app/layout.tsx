import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'CFT Source Map Builder',
  description: 'CFT AI citation research and source mapping tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
