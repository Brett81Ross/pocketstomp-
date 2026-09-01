import fs from 'node:fs';

const page = fs.readFileSync('app/page.js', 'utf8');
const layout = fs.readFileSync('app/layout.js', 'utf8');
const manifest = fs.readFileSync('public/manifest.webmanifest', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');
const v2 = fs.readFileSync('v2.css', 'utf8');
const coach2 = fs.readFileSync('coach2.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function expect(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

expect('production profile key', page.includes('pocketstomp.profile.v2'));
expect('production sessions key', page.includes('pocketstomp.sessions.v2'));
expect('production settings key', page.includes('pocketstomp.settings.v2'));
expect('100-session production retention contract', page.includes('const SESSION_LIMIT = 100'));
expect('no obsolete underscore profile key', !page.includes('pocketstomp_v2_profile'));
expect('no obsolete underscore sessions key', !page.includes('pocketstomp_v2_sessions'));
expect('no destructive storage clear', !page.includes('localStorage.clear'));
expect('calibration UI contract', page.includes('Calibrate your ride'));
expect('Board Fusion UI contract', page.includes('Board Fusion') && page.includes('MetaMotionS'));
expect('Coach 2.0 UI contract', page.includes('Coach 2.0') && page.includes('SMART COACHING'));
expect('weather coaching integration', page.includes('api.open-meteo.com'));
expect('speech synthesis integration', page.includes('SpeechSynthesisUtterance'));
expect('session history contract', page.includes('ON-DEVICE ARCHIVE · UP TO 100'));
expect('correction learning contract', page.includes('corrections:'));
expect('motion callback/listener refs separated', page.includes('motionCallbackRef') && page.includes('attachedMotionRef'));
expect('recursive first-draft listener removed', !page.includes('motionHandlerRef.current?.(event)'));
expect('production service worker registration retained for parity', page.includes('navigator.serviceWorker.register("/sw.js")'));
expect('production title', layout.includes('PocketStomp — Skate Session Tracker'));
expect('production description', layout.includes('Calibrated trick, landing, speed and board-motion analytics for skateboarders.'));
expect('production manifest name', manifest.includes('PocketStomp Skate Tracker'));
expect('production manifest icon path', manifest.includes('/pocketstomp-icon.png'));
expect('production service-worker cache name', sw.includes('pocketstomp-v2-coach2'));
expect('production service-worker core assets', sw.includes('/pocketstomp-boar.jpg') && sw.includes('/pocketstomp-icon.png'));
expect('historical V2 CSS fragment preserved', v2.includes('.calibrationModal') && v2.includes('.sessionList'));
expect('production Coach 2.0 CSS recovered', coach2.includes('.weatherStrip') && coach2.includes('.liveCoachBar'));
expect('Next.js pinned to production build version', pkg.dependencies.next === '16.2.12');
expect('React dependencies pinned', pkg.dependencies.react === '19.2.4' && pkg.dependencies['react-dom'] === '19.2.4');
expect('Fuel feature not mixed into source recovery', !page.includes('Fuel the Next Update'));

console.log('PocketStomp advanced V2 source-recovery contract QA passed.');
