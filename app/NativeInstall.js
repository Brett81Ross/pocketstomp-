'use client';

import { useState } from 'react';

const APK_URL = 'https://github.com/Brett81Ross/cactusbyte-studios/releases/download/android-latest/PocketStomp.apk';

export default function NativeInstall() {
  const [hint, setHint] = useState('');
  function install() {
    if (/CactusByteNative\/1\.0/i.test(navigator.userAgent)) return setHint('PocketStomp is already running as the installed Android app.');
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return setHint('Native iPhone/iPad installation will use TestFlight or the App Store — no browser shortcut.');
    setHint('Downloading the real PocketStomp Android app…');
    window.location.assign(APK_URL);
  }
  return (
    <div style={{ position: 'fixed', left: 14, bottom: 14, zIndex: 2147483000 }}>
      {hint ? <div style={{ marginBottom: 8, maxWidth: 320, padding: '8px 11px', borderRadius: 12, border: '1px solid rgba(157,227,221,.4)', background: '#090909', color: '#f5f5f5', fontSize: 11, lineHeight: 1.35, boxShadow: '0 10px 28px rgba(0,0,0,.35)' }}>{hint}</div> : null}
      <button type="button" onClick={install} style={{ minHeight: 44, padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(157,227,221,.65)', background: 'linear-gradient(180deg,#18332f,#090d0c)', color: '#f4fffd', fontWeight: 850, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.35)', cursor: 'pointer' }}>⬇ Install App</button>
    </div>
  );
}
