import './globals.css';
export const metadata = { title: 'AuraPay & Task Radar', description: 'AI bill & task radar for India' };
export const viewport = { themeColor: '#050816' };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
