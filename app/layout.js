import './globals.css';

export const metadata = {
  title: 'PocketStomp — Skate Session Tracker',
  description: 'Calibrated trick, landing, speed and board-motion analytics for skateboarders.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/pocketstomp-icon.png',
    apple: '/pocketstomp-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'PocketStomp',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#eaff31',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
