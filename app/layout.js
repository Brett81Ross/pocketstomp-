export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
        <footer
          style={{
            maxWidth: '900px',
            margin: '18px auto 28px',
            padding: '18px 16px 0',
            borderTop: '1px solid rgba(255,255,255,.14)',
            textAlign: 'center',
            color: '#a3a3a3',
            fontSize: '11px',
            lineHeight: 1.65,
          }}
        >
          <div>© 2026 PocketStomp™</div>
          <div>
            Powered by <strong style={{ color: '#9de3dd', fontWeight: 800 }}>Cactus🌵Byte Studios™</strong> · All Rights Reserved
          </div>
        </footer>
      </body>
    </html>
  )
}
