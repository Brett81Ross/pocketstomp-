#!/usr/bin/env python3
from pathlib import Path

path = Path('app/page.js')
text = path.read_text(encoding='utf-8')
changed = False


def replace_once(old: str, new: str, label: str) -> None:
    global text, changed
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one {label} anchor, found {count}')
    text = text.replace(old, new, 1)
    changed = True


replace_once(
    'import { useCallback, useEffect, useMemo, useRef, useState } from "react";\n',
    'import { useCallback, useEffect, useMemo, useRef, useState } from "react";\n'
    'import {\n'
    '  POCKETSTOMP_BACKUP,\n'
    '  buildPocketStompBackup,\n'
    '  mergePocketStompBackupIntoStorage,\n'
    '  parsePocketStompBackupText,\n'
    '} from "../lib/pocketstomp-backup.mjs";\n',
    'backup import',
)

replace_once(
    'function writeJson(key, value) {\n'
    '  if (typeof window === "undefined") return;\n'
    '  localStorage.setItem(key, JSON.stringify(value));\n'
    '}\n',
    'function writeJson(key, value) {\n'
    '  if (typeof window === "undefined") return;\n'
    '  localStorage.setItem(key, JSON.stringify(value));\n'
    '}\n\n'
    'function downloadJsonFile(prefix, payload) {\n'
    '  const stamp = new Date().toISOString().replace(/[:.]/g, "-");\n'
    '  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });\n'
    '  const url = URL.createObjectURL(blob);\n'
    '  const link = document.createElement("a");\n'
    '  link.href = url;\n'
    '  link.download = `${prefix}-${stamp}.json`;\n'
    '  document.body.appendChild(link);\n'
    '  link.click();\n'
    '  link.remove();\n'
    '  window.setTimeout(() => URL.revokeObjectURL(url), 1000);\n'
    '}\n',
    'download helper',
)

replace_once(
    '  const [calibration, setCalibration] = useState({ open: false, step: 0, progress: 0, busy: false, result: null });\n',
    '  const [calibration, setCalibration] = useState({ open: false, step: 0, progress: 0, busy: false, result: null });\n'
    '  const [backupBusy, setBackupBusy] = useState(false);\n',
    'backup busy state',
)

replace_once(
    '  const attachedMotionRef = useRef(null);\n',
    '  const attachedMotionRef = useRef(null);\n'
    '  const backupInputRef = useRef(null);\n',
    'backup input ref',
)

replace_once(
    '  const shareSummary = async () => {\n',
    '  const exportPocketStompData = () => {\n'
    '    setError("");\n'
    '    try {\n'
    '      const backup = buildPocketStompBackup(localStorage, {\n'
    '        appVersion: "1.0.0",\n'
    '        platform: navigator.userAgent.includes("CactusByteNative") ? "android-wrapper" : "web",\n'
    '        purpose: "user-backup",\n'
    '      });\n'
    '      downloadJsonFile("pocketstomp-backup", backup);\n'
    '      setStatus("PocketStomp backup downloaded. Keep it somewhere you can find after reinstalling.");\n'
    '    } catch (reason) {\n'
    '      setError(reason?.message || "PocketStomp could not create the backup file.");\n'
    '    }\n'
    '  };\n\n'
    '  const restorePocketStompData = async (event) => {\n'
    '    const file = event.target.files?.[0];\n'
    '    event.target.value = "";\n'
    '    if (!file) return;\n'
    '    setError("");\n'
    '    setBackupBusy(true);\n'
    '    try {\n'
    '      if (file.size > POCKETSTOMP_BACKUP.maxBytes) {\n'
    '        throw new Error("Backup file is larger than the 5 MB safety limit.");\n'
    '      }\n'
    '      const backupState = parsePocketStompBackupText(await file.text());\n'
    '      const preImport = buildPocketStompBackup(localStorage, {\n'
    '        appVersion: "1.0.0",\n'
    '        platform: navigator.userAgent.includes("CactusByteNative") ? "android-wrapper" : "web",\n'
    '        purpose: "pre-import-safety-backup",\n'
    '      });\n'
    '      downloadJsonFile("pocketstomp-pre-import", preImport);\n'
    '      const merged = mergePocketStompBackupIntoStorage(localStorage, backupState);\n'
    '      setProfile(merged.profile);\n'
    '      setSessions(Array.isArray(merged.sessions) ? merged.sessions.slice(0, SESSION_LIMIT) : []);\n'
    '      setSettings({ ...DEFAULT_SETTINGS, ...(merged.settings || {}) });\n'
    '      if (Number.isFinite(merged.profile?.threshold)) {\n'
    '        setSensitivity(clamp(merged.profile.threshold, 7, 30));\n'
    '      }\n'
    '      setStatus(`Backup merged safely. ${merged.sessions?.length || 0} local sessions are available; a pre-import safety backup was downloaded first.`);\n'
    '    } catch (reason) {\n'
    '      setError(reason?.message || "PocketStomp could not restore that backup.");\n'
    '    } finally {\n'
    '      setBackupBusy(false);\n'
    '    }\n'
    '  };\n\n'
    '  const shareSummary = async () => {\n',
    'backup handlers',
)

replace_once(
    '          <section className="card toolsCard">\n'
    '            <button className="utilityButton" onClick={() => setShowSimulator((value) => !value)}>TESTING SIMULATOR {showSimulator ? "−" : "+"}</button>\n'
    '            {showSimulator ? <div className="simulator"><p>Generate deterministic test events without pretending they came from the sensors.</p><div><button onClick={() => simulate("Ollie")}>SIM OLLIE</button><button onClick={() => simulate("Kickflip")}>SIM KICKFLIP</button><button onClick={() => simulate("360 Flip")}>SIM 360 FLIP</button><button onClick={() => simulate("Hard Landing")}>SIM HARD LANDING</button></div></div> : null}\n'
    '            <button className="utilityButton install" onClick={installApp}>INSTALL POCKETSTOMP</button>\n'
    '          </section>\n',
    '          <section className="card toolsCard">\n'
    '            <button className="utilityButton" onClick={() => setShowSimulator((value) => !value)}>TESTING SIMULATOR {showSimulator ? "−" : "+"}</button>\n'
    '            {showSimulator ? <div className="simulator"><p>Generate deterministic test events without pretending they came from the sensors.</p><div><button onClick={() => simulate("Ollie")}>SIM OLLIE</button><button onClick={() => simulate("Kickflip")}>SIM KICKFLIP</button><button onClick={() => simulate("360 Flip")}>SIM 360 FLIP</button><button onClick={() => simulate("Hard Landing")}>SIM HARD LANDING</button></div></div> : null}\n'
    '            <p className="tip">Before reinstalling or moving PocketStomp, back up your rider calibration, learned trick corrections, local session archive, and Coach settings.</p>\n'
    '            <button className="utilityButton" onClick={exportPocketStompData} disabled={backupBusy}>BACK UP POCKETSTOMP DATA</button>\n'
    '            <button className="utilityButton" onClick={() => backupInputRef.current?.click()} disabled={backupBusy}>{backupBusy ? "CHECKING BACKUP…" : "RESTORE / MERGE BACKUP"}</button>\n'
    '            <input ref={backupInputRef} type="file" accept="application/json,.json" onChange={restorePocketStompData} style={{ display: "none" }} />\n'
    '            <button className="utilityButton install" onClick={installApp}>INSTALL POCKETSTOMP</button>\n'
    '          </section>\n',
    'tools card',
)

required = [
    'buildPocketStompBackup',
    'parsePocketStompBackupText',
    'mergePocketStompBackupIntoStorage',
    'BACK UP POCKETSTOMP DATA',
    'RESTORE / MERGE BACKUP',
    'pocketstomp-pre-import',
    'pre-import safety backup was downloaded first',
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing PocketStomp backup UI contract marker: {marker}')

path.write_text(text, encoding='utf-8')
print('PocketStomp backup UI patch applied.' if changed else 'PocketStomp backup UI patch already applied.')
