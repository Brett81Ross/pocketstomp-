# PocketStomp™ Advanced V2 — Source Recovery Provenance

Status: **evidence-only recovery branch**. This branch is not canonical production source yet and must not be deployed or merged until it passes the production-parity and recovery QA gates below.

## Why this branch exists

The verified production project `pocketstomp-v2-brett81ross` serves an advanced V2 application that is not represented by either committed PocketStomp GitHub `main` branch currently accessible to CactusByte release engineering.

This branch was created from `Brett81Ross/pocketstomp-:main` only to preserve PocketStomp's existing Git history while reconstructing an editable source snapshot from verifiable production evidence.

## Production evidence anchor

- Vercel project: `pocketstomp-v2-brett81ross`
- Project ID: `prj_E7VyXL58dv6XUC8vr738yrsngYqz`
- Production deployment inspected: `dpl_9RozD8FT12vvssxbDeVG3AayDyEg`
- Production domain: `https://pocketstomp-v2-brett81ross.vercel.app/`
- Deployment state: `READY`
- Build framework/version: Next.js `16.2.12`
- Build package: `pocketstomp@1.0.0`
- Build log: 18 deployment files retrieved; no Git commit/repository metadata was exposed by the deployment record.

Evidence fetched read-only from the live deployment includes:

- rendered `/` HTML;
- the production client JavaScript chunk containing the advanced V2 application logic;
- the production CSS chunk;
- `/manifest.webmanifest`;
- `/sw.js`.

The connected Vercel tool does not expose the REST `GET /v6/deployments/{id}/files` source-file listing endpoint, and the production source map is not publicly available. Therefore this branch is a controlled reconstruction, not a claim that original formatting/file boundaries were recovered.

## Historical Git evidence

`Brett81Ross/pocketstomp-` is historically relevant. Its current `main` is an older v1.0 page, but several styling files are genuine source fragments that match blocks embedded in the advanced production CSS, including `v2.css`.

`Brett81Ross/pocketstomp` contains Create Next App template trees and is not the advanced production source.

## Production durable-state contract

The current production bundle uses these exact browser-local keys:

- `pocketstomp.profile.v2` — calibration profile and learned trick corrections;
- `pocketstomp.sessions.v2` — local session archive, capped at 100 sessions;
- `pocketstomp.settings.v2` — Coach mode, personality, selected voice, and Smart Coaching setting.

Any permanent-signing cutover recovery feature must preserve all three.

## Reconstruction rules

1. Recovered behavior must be traceable to the production bundle/HTML/CSS or a historical PocketStomp source fragment.
2. Do not add new product features while establishing parity.
3. Preserve the production service-worker behavior as evidence during parity recovery; service-worker removal is a separate release-quality change.
4. Do not wire live payments or `Fuel the Next Update` during source recovery. That portfolio feature remains staged separately.
5. Do not mark this branch canonical until a deliberate parity review is complete.
6. Do not deploy this branch to Vercel without explicit product-owner approval.
7. Do not merge this branch into `main` until exact-release QA is green.

## Canonical-source gate

Before this branch can become the source of record:

- [ ] advanced V2 UI/content matches the verified production behavior;
- [ ] calibration, session tracking, trick classification, correction learning, history, Coach 2.0, weather coaching, speech, Board Fusion pairing, simulator, share, and install behavior are source-audited;
- [ ] the three production localStorage keys and 100-session retention contract are preserved;
- [ ] production manifest metadata is represented;
- [ ] referenced static assets are recovered with provenance or deliberately replaced in a separately approved brand change;
- [ ] build passes from a pinned dependency manifest/lockfile;
- [ ] automated parity/recovery checks pass;
- [ ] a representative interactive Android/browser round trip passes on the exact release source;
- [ ] the CactusByte ABL and production registry are updated to the pinned Git commit;
- [ ] explicit merge/deploy approval is received.

Until then, **production remains the authority and this branch remains a recovery workspace only.**
