#!/usr/bin/env python3
from pathlib import Path

path = Path("app/page.js")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        "  const motionHandlerRef = useRef(null);\n",
        "  const motionCallbackRef = useRef(null);\n  const attachedMotionRef = useRef(null);\n",
    ),
    (
        "  useEffect(() => {\n    motionHandlerRef.current = handleMotion;\n  }, [handleMotion]);\n",
        "  useEffect(() => {\n    motionCallbackRef.current = handleMotion;\n  }, [handleMotion]);\n",
    ),
    (
        "  const stopRuntimeListeners = useCallback(() => {\n    if (motionHandlerRef.current) window.removeEventListener(\"devicemotion\", motionHandlerRef.current);\n",
        "  const stopRuntimeListeners = useCallback(() => {\n    if (attachedMotionRef.current) {\n      window.removeEventListener(\"devicemotion\", attachedMotionRef.current);\n      attachedMotionRef.current = null;\n    }\n",
    ),
    (
        "      const listener = (event) => motionHandlerRef.current?.(event);\n      motionHandlerRef.current = listener;\n      window.addEventListener(\"devicemotion\", listener, { passive: true });\n",
        "      const listener = (event) => motionCallbackRef.current?.(event);\n      attachedMotionRef.current = listener;\n      window.addEventListener(\"devicemotion\", listener, { passive: true });\n",
    ),
]

changed = False
for old, new in replacements:
    if new in text:
        continue
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one source anchor, found {count}: {old[:70]!r}")
    text = text.replace(old, new, 1)
    changed = True

# Contract guards: these should stay exact while recovering production V2.
required = [
    'const PROFILE_KEY = "pocketstomp.profile.v2";',
    'const SESSIONS_KEY = "pocketstomp.sessions.v2";',
    'const SETTINGS_KEY = "pocketstomp.settings.v2";',
    'const SESSION_LIMIT = 100;',
    'navigator.serviceWorker.register("/sw.js")',
    'PAIR METAMOTIONS',
    'Coach 2.0',
]
for marker in required:
    if marker not in text:
        raise SystemExit(f"Missing PocketStomp V2 recovery contract marker: {marker}")

path.write_text(text, encoding="utf-8")
print("PocketStomp V2 recovery fixes applied." if changed else "PocketStomp V2 recovery fixes already applied.")
