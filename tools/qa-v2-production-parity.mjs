import fs from 'node:fs';

const page = fs.readFileSync('app/page.js', 'utf8');
const renderedTextSource = page
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');
const layout = fs.readFileSync('app/layout.js', 'utf8');
const manifestText = fs.readFileSync('public/manifest.webmanifest', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');
const css = [
  fs.readFileSync('globals.css', 'utf8'),
  fs.readFileSync('coach.css', 'utf8'),
  fs.readFileSync('retro.css', 'utf8'),
  fs.readFileSync('v2.css', 'utf8'),
  fs.readFileSync('coach2.css', 'utf8'),
].join('\n');
const manifest = JSON.parse(manifestText);

function expect(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

// Read-only production snapshot captured from the verified Vercel production deployment
// dpl_9RozD8FT12vvssxbDeVG3AayDyEg on 2026-09-01. These checks deliberately
// cover initial-screen copy/metadata and durable-state contracts that can be
// proven without deploying the recovery branch.
const requiredPageStrings = [
  'PHONE + BOARD SKATE ANALYTICS',
  'POCKET',
  'STOMP',
  'POP IT',
  'STOMP IT',
  'TRACK IT',
  'CURRENT SPEED',
  'RUN TIME',
  'MAX SPEED',
  'TRICKS',
  'VERTICAL',
  'Ready when you are.',
  'RIDER-SPECIFIC ACCURACY',
  'Calibrate your ride',
  'Calibration teaches PocketStomp the difference between your push, pop, airtime, and landing.',
  'START 3-STEP CALIBRATION',
  'OPTIONAL DECK TELEMETRY',
  'Board Fusion',
  'Pair and verify a MetaMotionS mounted under the deck. Phone tracking works now; raw board-data fusion requires the hardware stream adapter after the sensor is configured.',
  'PAIR METAMOTIONS',
  'NATURAL VOICE · WEATHER · TECHNIQUE',
  'Coach 2.0',
  'FULL COACH',
  'Hype Skate Buddy',
  'Experienced Coach',
  'Dry & Sarcastic',
  'Minimal Callouts',
  'PHONE DEFAULT',
  'SMART COACHING ON',
  'LOCAL SKATE CONDITIONS',
  'CHECK BEFORE THE SESSION',
  'CHECK LOCAL CONDITIONS',
  'TEST NATURAL VOICE',
  'Coach 2.0 is ready.',
  'MANUAL FINE-TUNING',
  'Pop sensitivity',
  'More sensitive',
  'Fewer false pops',
  'TESTING SIMULATOR',
  'START SESSION',
  'HEIGHT · AIRTIME · CONFIDENCE · LANDING',
  'Trick log',
  'THE CONCRETE IS WAITING',
  'Calibrate, secure your phone, and go land something.',
  '© 2026 Powered by Cactus🌵Byte Studios™',
];

for (const marker of requiredPageStrings) {
  expect(`production UI marker: ${marker}`, renderedTextSource.includes(marker));
}

expect('ride tab exists', page.includes('>RIDE<'));
expect('history tab exists', page.includes('>HISTORY '));
expect('initial full coach default preserved', page.includes('coachMode: "full"'));
expect('initial smart coaching default preserved', page.includes('smartCoach: true'));
expect('production sensitivity minimum', page.includes('min="7"'));
expect('production sensitivity maximum', page.includes('max="30"'));
expect('production sensitivity initial state', page.includes('useState(15)'));
expect('production profile key exact', page.includes('const PROFILE_KEY = "pocketstomp.profile.v2"'));
expect('production sessions key exact', page.includes('const SESSIONS_KEY = "pocketstomp.sessions.v2"'));
expect('production settings key exact', page.includes('const SETTINGS_KEY = "pocketstomp.settings.v2"'));
expect('production 100-session archive cap', page.includes('const SESSION_LIMIT = 100'));
expect('history copy exposes 100-session archive', page.includes('ON-DEVICE ARCHIVE · UP TO 100'));

expect('production title exact', layout.includes("title: 'PocketStomp — Skate Session Tracker'"));
expect('production description exact', layout.includes("description: 'Calibrated trick, landing, speed and board-motion analytics for skateboarders.'"));
expect('production theme color exact', layout.includes("themeColor: '#eaff31'"));
expect('production maximum scale exact', layout.includes('maximumScale: 1'));
expect('production manifest path exact', layout.includes("manifest: '/manifest.webmanifest'"));
expect('production icon path exact in layout', layout.includes("'/pocketstomp-icon.png'"));

expect('manifest name exact', manifest.name === 'PocketStomp Skate Tracker');
expect('manifest short name exact', manifest.short_name === 'PocketStomp');
expect('manifest description exact', manifest.description === 'Calibrated skateboard trick, landing, speed and board-motion analytics.');
expect('manifest standalone exact', manifest.display === 'standalone');
expect('manifest background exact', manifest.background_color === '#050505');
expect('manifest theme exact', manifest.theme_color === '#ff1493');
expect('manifest portrait exact', manifest.orientation === 'portrait');
expect('manifest icon contract exact', Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.src === '/pocketstomp-icon.png' && icon.sizes === '256x256' && icon.type === 'image/png'));

expect('production service worker cache exact', sw.includes('const CACHE = "pocketstomp-v2-coach2"'));
expect('production service worker core list includes root', sw.includes('["/", "/manifest.webmanifest", "/pocketstomp-boar.jpg", "/pocketstomp-icon.png"]'));
expect('production service worker registration exact', page.includes('navigator.serviceWorker.register("/sw.js")'));

expect('four-column production metrics layer', css.includes('.metrics{grid-template-columns:repeat(4,1fr)}'));
expect('production weather strip layer', css.includes('.weatherStrip'));
expect('production live coach bar layer', css.includes('.liveCoachBar'));
expect('production calibration modal layer', css.includes('.calibrationModal'));
expect('production session list layer', css.includes('.sessionList'));
expect('production trick analysis layer', css.includes('.trickV2'));

console.log('PocketStomp verified-production parity contract passed.');
