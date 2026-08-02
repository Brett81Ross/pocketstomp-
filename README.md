PocketStomp
Pocket-powered skateboard session tracking for mobile browsers. It uses phone motion sensors and GPS to estimate tricks, speed, airtime, rotation, scores, and run stats. Earbud Coach provides live spoken trick, score, airtime, and speed feedback through the phone's active audio output without an API key or microphone.
PocketStomp V2 adds three-stage rider calibration, pop/air/landing state analysis, confidence and landing scores, correction-based learning, local session history and personal records, installable offline PWA support, selectable coach personalities, a testing simulator, and optional MetaMotionS Bluetooth board pairing.
Run locally
npm install
npm run dev
Motion and GPS permissions require HTTPS when deployed and work best on a physical phone. Import the repository into Vercel and use the default Next.js settings; no environment variables are required.
PocketStomp is a beta estimator, not competition-grade telemetry. Keep the phone secure and skate within your ability.
