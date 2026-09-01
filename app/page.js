"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PROFILE_KEY = "pocketstomp.profile.v2";
const SESSIONS_KEY = "pocketstomp.sessions.v2";
const SETTINGS_KEY = "pocketstomp.settings.v2";
const SESSION_LIMIT = 100;

const DEFAULT_SETTINGS = {
  coachMode: "full",
  personality: "hype",
  voiceName: "",
  smartCoach: true,
};

const TRICK_NAMES = [
  "Ollie",
  "Pop Shuvit",
  "360 Shuvit",
  "Kickflip",
  "Heelflip",
  "360 Flip",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function magnitude(source) {
  if (!source) return 0;
  const x = Number(source.x || 0);
  const y = Number(source.y || 0);
  const z = Number(source.z || 0);
  return Math.sqrt(x * x + y * y + z * z);
}

function formatClock(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(value / 60)).padStart(2, "0");
  const secs = String(value % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

function makeSessionId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function requestMotionPermission() {
  if (typeof DeviceMotionEvent === "undefined") {
    throw new Error("Motion sensors are not available in this browser.");
  }
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission !== "granted") throw new Error("Motion permission was not granted.");
  }
}

function classifyTrick({ roll, yaw, pitch, force, airtime, landing }) {
  const absRoll = Math.abs(roll);
  const absYaw = Math.abs(yaw);
  const absPitch = Math.abs(pitch);
  let rawName = "Ollie";

  if (absRoll >= 185 && absYaw >= 175) rawName = "360 Flip";
  else if (absRoll >= 220) rawName = roll >= 0 ? "Kickflip" : "Heelflip";
  else if (absYaw >= 285) rawName = "360 Shuvit";
  else if (absYaw >= 145) rawName = "Pop Shuvit";
  else if (absPitch >= 185 && force >= 18) rawName = "Ollie";

  const rotationQuality = clamp((Math.max(absRoll, absYaw, absPitch) / 360) * 38, 0, 38);
  const popQuality = clamp(((force - 8) / 22) * 24, 0, 24);
  const airQuality = clamp((airtime / 0.9) * 20, 0, 20);
  const landingQuality = clamp(18 - Math.max(0, landing - 14) * 0.7, 2, 18);
  const score = Math.round((rotationQuality + popQuality + airQuality + landingQuality) * 10);
  const confidence = Math.round(clamp(55 + rotationQuality * 0.8 + popQuality * 0.6, 55, 98));
  const grade = score >= 860 ? "S" : score >= 720 ? "A" : score >= 560 ? "B" : "C";

  return { rawName, score, confidence, grade };
}

function buildCoachLine(trick, personality) {
  const landing = trick.landing <= 13 ? "clean landing" : trick.landing <= 18 ? "solid landing" : "heavy landing";
  const base = `${trick.name}: ${trick.height.toFixed(1)} feet, ${trick.airtime.toFixed(2)} seconds of air, ${landing}.`;
  if (personality === "straight") return `${base} Keep your shoulders centered and stay over the bolts.`;
  if (personality === "sarcastic") return trick.grade === "S" ? `${base} Annoyingly clean. Do it again.` : `${base} The concrete has notes. Tighten it up.`;
  if (personality === "minimal") return `${trick.name}. ${trick.grade} grade. ${landing}.`;
  return trick.grade === "S" ? `${base} That was stomped. Keep rolling!` : `${base} Nice one. Clean up the landing and run it back.`;
}

function weatherAdvice(current, uv) {
  const tempC = Number(current?.temperature_2m ?? 20);
  const tempF = tempC * 9 / 5 + 32;
  const wind = Number(current?.wind_speed_10m ?? 0);
  const rain = Number(current?.precipitation ?? 0);
  const uvValue = Number(uv ?? 0);

  if (rain > 0.05) return { level: "stop", label: "WET", text: "Wet pavement detected. Skip the session until the surface is dry.", tempF, wind, rain, uv: uvValue };
  if (tempF >= 96) return { level: "warn", label: "HEAT", text: "High heat. Shorten the session, hydrate, and take shade breaks.", tempF, wind, rain, uv: uvValue };
  if (wind >= 25) return { level: "warn", label: "WIND", text: "Strong wind can move the board and affect landings. Use extra caution.", tempF, wind, rain, uv: uvValue };
  if (tempF <= 36) return { level: "caution", label: "COLD", text: "Cold conditions can reduce grip and mobility. Warm up before hard attempts.", tempF, wind, rain, uv: uvValue };
  if (uvValue >= 8) return { level: "caution", label: "UV", text: "High UV. Use sun protection and plan breaks.", tempF, wind, rain, uv: uvValue };
  return { level: "clear", label: "CLEAR", text: "Conditions look reasonable for a session. Check the actual pavement before skating.", tempF, wind, rain, uv: uvValue };
}

export default function Home() {
  const [tab, setTab] = useState("ride");
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Ready when you are.");
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [vertical, setVertical] = useState(0);
  const [tricks, setTricks] = useState([]);
  const [sensitivity, setSensitivity] = useState(15);
  const [lastSummary, setLastSummary] = useState(null);
  const [voices, setVoices] = useState([]);
  const [weather, setWeather] = useState(null);
  const [coachNow, setCoachNow] = useState("Coach 2.0 is ready.");
  const [board, setBoard] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [calibration, setCalibration] = useState({ open: false, step: 0, progress: 0, busy: false, result: null });

  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const watchRef = useRef(null);
  const lastMotionRef = useRef(performance?.now?.() || 0);
  const lastTrickAtRef = useRef(0);
  const candidateRef = useRef(null);
  const tricksRef = useRef([]);
  const maxSpeedRef = useRef(0);
  const verticalRef = useRef(0);
  const speedSamplesRef = useRef([]);
  const motionCallbackRef = useRef(null);
  const attachedMotionRef = useRef(null);

  useEffect(() => {
    const storedProfile = readJson(PROFILE_KEY, null);
    const storedSessions = readJson(SESSIONS_KEY, []);
    const storedSettings = readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
    setProfile(storedProfile && typeof storedProfile === "object" ? storedProfile : null);
    setSessions(Array.isArray(storedSessions) ? storedSessions.slice(0, SESSION_LIMIT) : []);
    setSettings({ ...DEFAULT_SETTINGS, ...(storedSettings && typeof storedSettings === "object" ? storedSettings : {}) });
    if (Number.isFinite(storedProfile?.threshold)) setSensitivity(clamp(storedProfile.threshold, 7, 30));

    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices?.().filter((voice) => /^en/i.test(voice.lang)) || []);
    loadVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);

    const captureInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", captureInstall);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
      window.removeEventListener("beforeinstallprompt", captureInstall);
    };
  }, []);

  const persistSettings = useCallback((patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writeJson(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  const speak = useCallback((text) => {
    if (!text || settings.coachMode === "off" || typeof speechSynthesis === "undefined") return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.personality === "minimal" ? 1.08 : 1;
      utterance.pitch = 1;
      const selected = voices.find((voice) => voice.name === settings.voiceName)
        || voices.find((voice) => /Google|Samantha|Ava|Siri|Natural|Enhanced/i.test(voice.name))
        || voices[0];
      if (selected) utterance.voice = selected;
      speechSynthesis.speak(utterance);
    } catch {}
  }, [settings.coachMode, settings.personality, settings.voiceName, voices]);

  const addDetectedTrick = useCallback((metrics) => {
    const classified = classifyTrick(metrics);
    const correctedName = profile?.corrections?.[classified.rawName] || classified.rawName;
    const heightMeters = 9.80665 * (metrics.airtime ** 2) / 8;
    const trick = {
      id: makeSessionId(),
      time: new Date().toISOString(),
      rawName: classified.rawName,
      name: correctedName,
      grade: classified.grade,
      score: classified.score,
      confidence: classified.confidence,
      force: round(metrics.force, 1),
      airtime: round(metrics.airtime, 2),
      height: round(heightMeters * 3.28084, 1),
      landing: round(metrics.landing, 1),
      roll: round(metrics.roll, 1),
      yaw: round(metrics.yaw, 1),
      pitch: round(metrics.pitch, 1),
    };

    tricksRef.current = [trick, ...tricksRef.current];
    setTricks(tricksRef.current);
    verticalRef.current = round(verticalRef.current + trick.height, 1);
    setVertical(verticalRef.current);

    if (settings.coachMode !== "off" && settings.smartCoach) {
      const line = buildCoachLine(trick, settings.personality);
      setCoachNow(line);
      if (settings.coachMode === "full" || settings.coachMode === "tricks") speak(line);
    }
  }, [profile, settings.coachMode, settings.personality, settings.smartCoach, speak]);

  const handleMotion = useCallback((event) => {
    if (!tracking) return;
    const now = performance.now();
    const dt = clamp((now - lastMotionRef.current) / 1000, 0.005, 0.1);
    lastMotionRef.current = now;

    const accel = magnitude(event.accelerationIncludingGravity || event.acceleration);
    const rotation = event.rotationRate || {};
    const rollRate = Number(rotation.gamma || 0);
    const yawRate = Number(rotation.alpha || 0);
    const pitchRate = Number(rotation.beta || 0);

    if (candidateRef.current) {
      const c = candidateRef.current;
      c.roll += rollRate * dt;
      c.yaw += yawRate * dt;
      c.pitch += pitchRate * dt;
      c.peak = Math.max(c.peak, accel);
      c.landing = Math.max(c.landing, accel);
      const age = (now - c.startedAt) / 1000;
      if (age >= c.airtime) {
        candidateRef.current = null;
        addDetectedTrick({
          roll: c.roll,
          yaw: c.yaw,
          pitch: c.pitch,
          force: c.peak,
          landing: c.landing,
          airtime: c.airtime,
        });
      }
      return;
    }

    if (accel >= sensitivity && now - lastTrickAtRef.current > 850) {
      lastTrickAtRef.current = now;
      const calibratedPop = Number(profile?.popPeak || sensitivity + 7);
      const airtime = clamp(0.28 + Math.max(0, accel - sensitivity) / Math.max(25, calibratedPop) * 0.48, 0.22, 0.95);
      candidateRef.current = {
        startedAt: now,
        airtime,
        peak: accel,
        landing: accel,
        roll: rollRate * dt,
        yaw: yawRate * dt,
        pitch: pitchRate * dt,
      };
    }
  }, [addDetectedTrick, profile?.popPeak, sensitivity, tracking]);

  useEffect(() => {
    motionCallbackRef.current = handleMotion;
  }, [handleMotion]);

  const stopRuntimeListeners = useCallback(() => {
    if (attachedMotionRef.current) {
      window.removeEventListener("devicemotion", attachedMotionRef.current);
      attachedMotionRef.current = null;
    }
    if (watchRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopRuntimeListeners(), [stopRuntimeListeners]);

  const startSession = async () => {
    setError("");
    try {
      await requestMotionPermission();
      tricksRef.current = [];
      speedSamplesRef.current = [];
      maxSpeedRef.current = 0;
      verticalRef.current = 0;
      candidateRef.current = null;
      setTricks([]);
      setSpeed(0);
      setMaxSpeed(0);
      setVertical(0);
      setElapsed(0);
      setLastSummary(null);
      startTimeRef.current = Date.now();
      lastMotionRef.current = performance.now();
      setTracking(true);
      setStatus("LIVE — phone motion tracking active.");

      const listener = (event) => motionCallbackRef.current?.(event);
      attachedMotionRef.current = listener;
      window.addEventListener("devicemotion", listener, { passive: true });

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      if ("geolocation" in navigator) {
        watchRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const metersPerSecond = Number(position.coords.speed);
            if (!Number.isFinite(metersPerSecond) || metersPerSecond < 0) return;
            const mph = metersPerSecond * 2.236936;
            setSpeed(round(mph, 1));
            speedSamplesRef.current.push(mph);
            maxSpeedRef.current = Math.max(maxSpeedRef.current, mph);
            setMaxSpeed(round(maxSpeedRef.current, 1));
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 },
        );
      }
    } catch (reason) {
      setError(reason?.message || "PocketStomp could not start motion tracking.");
      setStatus("Sensor permission is required to track a session.");
    }
  };

  const stopSession = () => {
    stopRuntimeListeners();
    setTracking(false);
    setSpeed(0);
    setStatus("Session saved locally.");
    const duration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const samples = speedSamplesRef.current;
    const avgSpeed = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
    const best = tricksRef.current.reduce((winner, trick) => !winner || trick.score > winner.score ? trick : winner, null);
    const totalScore = tricksRef.current.reduce((sum, trick) => sum + trick.score, 0);
    const session = {
      id: makeSessionId(),
      startedAt: new Date(startTimeRef.current).toISOString(),
      endedAt: new Date().toISOString(),
      duration,
      avgSpeed: round(avgSpeed, 1),
      maxSpeed: round(maxSpeedRef.current, 1),
      vertical: round(verticalRef.current, 1),
      totalScore,
      bestTrick: best,
      tricks: [...tricksRef.current],
      profileVersion: profile?.version || null,
    };
    const nextSessions = [session, ...sessions].slice(0, SESSION_LIMIT);
    setSessions(nextSessions);
    writeJson(SESSIONS_KEY, nextSessions);
    setLastSummary(session);
    if (settings.coachMode === "full") {
      const line = best
        ? `Session saved. Best trick was ${best.name}, ${best.grade} grade. ${tricksRef.current.length} tricks total.`
        : "Session saved. No tricks were confidently detected this run.";
      setCoachNow(line);
      speak(line);
    }
  };

  const runCalibrationStep = async (step) => {
    setError("");
    try {
      await requestMotionPermission();
    } catch (reason) {
      setError(reason?.message || "Motion permission is required for calibration.");
      return;
    }

    setCalibration((current) => ({ ...current, busy: true, step, progress: 0 }));
    const samples = [];
    const rotations = [];
    const handler = (event) => {
      samples.push(magnitude(event.accelerationIncludingGravity || event.acceleration));
      rotations.push(magnitude(event.rotationRate));
    };
    window.addEventListener("devicemotion", handler, { passive: true });
    const started = Date.now();
    const progressTimer = setInterval(() => {
      setCalibration((current) => ({ ...current, progress: clamp((Date.now() - started) / 24, 0, 100) }));
    }, 100);
    await new Promise((resolve) => setTimeout(resolve, 2400));
    clearInterval(progressTimer);
    window.removeEventListener("devicemotion", handler);

    const average = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
    const peak = samples.length ? Math.max(...samples) : 0;
    const rotationPeak = rotations.length ? Math.max(...rotations) : 0;
    const result = { average: round(average, 2), peak: round(peak, 2), rotationPeak: round(rotationPeak, 2), samples: samples.length };
    setCalibration((current) => ({ ...current, busy: false, progress: 100, result }));

    if (step < 2) {
      setCalibration((current) => ({ ...current, step: step + 1, progress: 0, result }));
      return;
    }

    const previous = calibration.result || {};
    const stillAverage = Number(profile?.baseline || 9.8);
    const popPeak = Math.max(peak, Number(previous.peak || 0), 16);
    const threshold = round(clamp(Math.max(7, stillAverage + (popPeak - stillAverage) * 0.42), 7, 30), 1);
    const nextProfile = {
      ...(profile || {}),
      version: 2,
      calibratedAt: new Date().toISOString(),
      baseline: round(stillAverage || average, 2),
      noise: round(Math.abs(peak - average), 2),
      popPeak: round(popPeak, 2),
      rotationPeak: round(rotationPeak, 2),
      threshold,
      corrections: profile?.corrections || {},
    };
    setProfile(nextProfile);
    setSensitivity(threshold);
    writeJson(PROFILE_KEY, nextProfile);
    setCalibration({ open: false, step: 0, progress: 0, busy: false, result: null });
    setStatus(`Calibration saved. Pop threshold set to ${threshold.toFixed(1)} m/s².`);
  };

  const startCalibration = () => {
    setCalibration({ open: true, step: 0, progress: 0, busy: false, result: null });
  };

  const pairBoard = async () => {
    setError("");
    if (!navigator.bluetooth) {
      setError("Web Bluetooth is not available on this browser/device.");
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "MetaMotion" }, { namePrefix: "MetaWear" }],
        optionalServices: ["battery_service"],
      });
      await device.gatt?.connect?.();
      setBoard({ name: device.name || "MetaMotionS", id: device.id });
      setStatus(`${device.name || "MetaMotionS"} paired. Phone tracking remains the active analytics stream.`);
    } catch (reason) {
      if (reason?.name !== "NotFoundError") setError(reason?.message || "Board pairing did not complete.");
    }
  };

  const checkWeather = () => {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Location is unavailable for local skate conditions.");
      return;
    }
    setCoachNow("Checking local skate conditions…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", coords.latitude);
        url.searchParams.set("longitude", coords.longitude);
        url.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,wind_speed_10m");
        url.searchParams.set("daily", "uv_index_max");
        url.searchParams.set("forecast_days", "1");
        url.searchParams.set("timezone", "auto");
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather request failed (${response.status}).`);
        const data = await response.json();
        const advice = weatherAdvice(data.current, data.daily?.uv_index_max?.[0]);
        setWeather(advice);
        setCoachNow(advice.text);
        if (settings.coachMode === "full") speak(advice.text);
      } catch (reason) {
        setError(reason?.message || "Local conditions could not be loaded.");
        setCoachNow("Local conditions are unavailable. Check the pavement and weather before skating.");
      }
    }, () => {
      setError("Location permission is required to check local skate conditions.");
      setCoachNow("Local conditions are unavailable without location permission.");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  };

  const testVoice = () => {
    speak("PocketStomp Coach 2.0 is ready. Pop it, stomp it, track it.");
  };

  const correctTrick = (rawName, correctedName) => {
    const nextProfile = {
      ...(profile || { version: 2, threshold: sensitivity }),
      corrections: { ...(profile?.corrections || {}), [rawName]: correctedName },
    };
    setProfile(nextProfile);
    writeJson(PROFILE_KEY, nextProfile);
    setTricks((current) => {
      const next = current.map((trick) => trick.rawName === rawName ? { ...trick, name: correctedName } : trick);
      tricksRef.current = next;
      return next;
    });
    setStatus(`Learned correction: ${rawName} → ${correctedName}.`);
  };

  const simulate = (name) => {
    const presets = {
      Ollie: { roll: 18, yaw: 22, pitch: 120, force: 19, airtime: 0.48, landing: 13 },
      Kickflip: { roll: 295, yaw: 45, pitch: 95, force: 22, airtime: 0.61, landing: 15 },
      "360 Flip": { roll: 255, yaw: 315, pitch: 110, force: 25, airtime: 0.69, landing: 16 },
      "Hard Landing": { roll: 35, yaw: 30, pitch: 90, force: 18, airtime: 0.42, landing: 27 },
    };
    const metrics = presets[name];
    if (!metrics) return;
    addDetectedTrick(metrics);
  };

  const installApp = async () => {
    if (!installPrompt) {
      setStatus("Use your browser's Install app / Add to Home Screen action on this device.");
      return;
    }
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {}
  };

  const shareSummary = async () => {
    if (!lastSummary) return;
    const best = lastSummary.bestTrick;
    const text = `🛹 PocketStomp session\n${lastSummary.tricks.length} tricks · ${lastSummary.maxSpeed.toFixed(1)} mph max · ${lastSummary.vertical.toFixed(1)} ft vertical${best ? `\nBest: ${best.name} (${best.grade}, ${best.score} pts)` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: "PocketStomp Session", text });
      else {
        await navigator.clipboard.writeText(text);
        setStatus("Session summary copied to clipboard.");
      }
    } catch {}
  };

  const totalScore = tricks.reduce((sum, trick) => sum + trick.score, 0);
  const bestTrick = tricks.reduce((winner, trick) => !winner || trick.score > winner.score ? trick : winner, null);

  const records = useMemo(() => {
    const allTricks = sessions.flatMap((session) => Array.isArray(session.tricks) ? session.tricks : []);
    return {
      sessions: sessions.length,
      maxSpeed: sessions.reduce((max, session) => Math.max(max, Number(session.maxSpeed || 0)), 0),
      vertical: sessions.reduce((sum, session) => sum + Number(session.vertical || 0), 0),
      bestScore: allTricks.reduce((max, trick) => Math.max(max, Number(trick.score || 0)), 0),
    };
  }, [sessions]);

  const calibrationCopy = [
    { title: "STILL", text: "Set the phone where you normally carry it and stand completely still." },
    { title: "PUSH", text: "Push and roll naturally so PocketStomp learns your normal riding movement." },
    { title: "POP", text: "Do one clean ollie/pop so PocketStomp can learn your personal launch signature." },
  ][calibration.step] || { title: "CALIBRATE", text: "Follow the calibration steps." };

  return (
    <main className="app v2">
      <header>
        <div className="logo">PS</div>
        <div><small>PHONE + BOARD SKATE ANALYTICS</small><h1>POCKET<span>STOMP</span></h1></div>
        <b className={`live ${tracking ? "on" : ""}`}>{tracking ? "LIVE" : "IDLE"}</b>
      </header>

      <div className="marquee"><span>POP IT</span><b>★</b><span>STOMP IT</span><b>★</b><span>TRACK IT</span></div>

      <nav className="tabs" aria-label="PocketStomp views">
        <button className={tab === "ride" ? "active" : ""} onClick={() => setTab("ride")}>RIDE</button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>HISTORY <span>{sessions.length}</span></button>
      </nav>

      {tab === "ride" ? <>
        <section className="hero">
          <label>CURRENT SPEED</label>
          <div className="speed"><strong>{speed.toFixed(1)}</strong><span>MPH</span></div>
          <div className="metrics">
            <p><small>RUN TIME</small><b>{formatClock(elapsed)}</b></p>
            <p><small>MAX SPEED</small><b>{maxSpeed.toFixed(1)} mph</b></p>
            <p><small>TRICKS</small><b>{tricks.length}</b></p>
            <p><small>VERTICAL</small><b>{vertical.toFixed(1)} ft</b></p>
          </div>
        </section>

        <p className="status"><i></i>{status}</p>
        {error ? <div className="error" role="alert">{error}</div> : null}

        {!tracking ? <div className="controlStack">
          <section className="card calibrationCard">
            <div className="heading"><div><small>RIDER-SPECIFIC ACCURACY</small><h2>Calibrate your ride</h2></div><strong>01</strong></div>
            <p className="tip">Calibration teaches PocketStomp the difference between your push, pop, airtime, and landing.</p>
            <button className={`utilityButton ${profile?.calibratedAt ? "connected" : ""}`} onClick={startCalibration}>{profile?.calibratedAt ? "✓ RECALIBRATE RIDER PROFILE" : "START 3-STEP CALIBRATION"}</button>
          </section>

          <section className="card boardCard">
            <div className="heading"><div><small>OPTIONAL DECK TELEMETRY</small><h2>Board Fusion</h2></div><strong>02</strong></div>
            <p className="tip">Pair and verify a MetaMotionS mounted under the deck. Phone tracking works now; raw board-data fusion requires the hardware stream adapter after the sensor is configured.</p>
            <button className={`utilityButton ${board ? "connected" : ""}`} onClick={pairBoard}>{board ? `✓ ${board.name?.toUpperCase() || "METAMOTIONS"} PAIRED` : "PAIR METAMOTIONS"}</button>
          </section>

          <section className="coach card">
            <div className="heading"><div><small>NATURAL VOICE · WEATHER · TECHNIQUE</small><h2>Coach 2.0</h2></div><strong>◖◗</strong></div>
            <div className="coachModes">
              <button className={settings.coachMode === "off" ? "selected" : ""} onClick={() => persistSettings({ coachMode: "off" })}>OFF</button>
              <button className={settings.coachMode === "tricks" ? "selected" : ""} onClick={() => persistSettings({ coachMode: "tricks" })}>TRICKS</button>
              <button className={settings.coachMode === "full" ? "selected" : ""} onClick={() => persistSettings({ coachMode: "full" })}>FULL COACH</button>
            </div>
            <div className="personality"><label>PERSONALITY</label><select value={settings.personality} onChange={(event) => persistSettings({ personality: event.target.value })}><option value="hype">Hype Skate Buddy</option><option value="straight">Experienced Coach</option><option value="sarcastic">Dry &amp; Sarcastic</option><option value="minimal">Minimal Callouts</option></select></div>
            <div className="personality"><label>NATURAL VOICE</label><select value={settings.voiceName} onChange={(event) => persistSettings({ voiceName: event.target.value })}><option value="">PHONE DEFAULT</option>{voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name.toUpperCase()}</option>)}</select></div>
            <button className={`utilityButton coachToggle ${settings.smartCoach ? "connected" : ""}`} onClick={() => persistSettings({ smartCoach: !settings.smartCoach })}>{settings.smartCoach ? "✓ SMART COACHING ON" : "SMART COACHING OFF"}</button>
            <div className={`weatherStrip ${weather?.level || "clear"}`}><div><small>LOCAL SKATE CONDITIONS</small><b>{weather ? `${weather.tempF.toFixed(0)}°F · ${weather.wind.toFixed(0)} MPH WIND · UV ${weather.uv.toFixed(0)}` : "CHECK BEFORE THE SESSION"}</b></div>{weather ? <strong>{weather.label}</strong> : null}</div>
            <button className="testAudio" onClick={checkWeather}>⌖ CHECK LOCAL CONDITIONS</button>
            <button className="testAudio voiceTest" onClick={testVoice} disabled={settings.coachMode === "off"}>▶ TEST NATURAL VOICE</button>
            <div className="coachNow"><small>COACH NOW</small><p>{coachNow}</p></div>
          </section>

          <section className="card">
            <div className="heading"><div><small>MANUAL FINE-TUNING</small><h2>Pop sensitivity</h2></div><strong>{sensitivity.toFixed(1)}</strong></div>
            <input aria-label="Pop sensitivity" type="range" min="7" max="30" step=".5" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} />
            <div className="range"><span>More sensitive</span><span>Fewer false pops</span></div>
          </section>

          <section className="card toolsCard">
            <button className="utilityButton" onClick={() => setShowSimulator((value) => !value)}>TESTING SIMULATOR {showSimulator ? "−" : "+"}</button>
            {showSimulator ? <div className="simulator"><p>Generate deterministic test events without pretending they came from the sensors.</p><div><button onClick={() => simulate("Ollie")}>SIM OLLIE</button><button onClick={() => simulate("Kickflip")}>SIM KICKFLIP</button><button onClick={() => simulate("360 Flip")}>SIM 360 FLIP</button><button onClick={() => simulate("Hard Landing")}>SIM HARD LANDING</button></div></div> : null}
            <button className="utilityButton install" onClick={installApp}>INSTALL POCKETSTOMP</button>
          </section>
        </div> : null}

        <button className={`mainButton ${tracking ? "stop" : ""}`} onClick={tracking ? stopSession : startSession}>{tracking ? "■  END SESSION" : "▶  START SESSION"}</button>

        {lastSummary ? <section className="summary"><small>SESSION SAVED LOCALLY</small><h2>{lastSummary.totalScore}<span> PTS</span></h2><div><p><small>MAX SPEED</small><b>{lastSummary.maxSpeed.toFixed(1)} MPH</b></p><p><small>BEST TRICK</small><b>{lastSummary.bestTrick?.name || "—"}</b></p></div><button onClick={shareSummary}>SHARE SESSION</button></section> : null}

        {tracking && settings.coachMode !== "off" ? <div className="liveCoachBar"><small>COACH 2.0 · LIVE</small><p>{coachNow}</p><b>{settings.smartCoach ? "SMART COACHING ON" : "MANUAL COACH"}</b><button onClick={() => speak(coachNow)}>REPLAY COACH</button></div> : null}

        <section className="feed">
          <div className="heading"><div><small>HEIGHT · AIRTIME · CONFIDENCE · LANDING</small><h2>Trick log</h2></div><strong>{String(tricks.length).padStart(2, "0")}</strong></div>
          {tricks.length ? <ol>{tricks.map((trick) => <li className="trickV2" key={trick.id}><span className={`grade g${trick.grade}`}>{trick.grade}</span><p className="trickInfo"><strong>{trick.name}</strong><small>{trick.height.toFixed(1)} ft · {trick.airtime.toFixed(2)}s air · {trick.confidence}% confidence · landing {trick.landing.toFixed(1)}</small><div className="analysisBar"><i style={{ width: `${trick.confidence}%` }} /></div><select aria-label={`Correct ${trick.name}`} value={trick.name} onChange={(event) => correctTrick(trick.rawName, event.target.value)}>{TRICK_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}</select></p><div className="trickScore"><b>{trick.score}</b><small>PTS</small></div></li>)}</ol> : <div className="empty"><b>✦</b><h3>THE CONCRETE IS WAITING</h3><p>Calibrate, secure your phone, and go land something.</p></div>}
        </section>
      </> : <section className="historyPage">
        <div className="recordGrid"><article><small>SESSIONS</small><b>{records.sessions}</b></article><article><small>TOP SPEED</small><b>{records.maxSpeed.toFixed(1)}</b></article><article><small>VERTICAL FT</small><b>{records.vertical.toFixed(1)}</b></article><article><small>BEST SCORE</small><b>{records.bestScore}</b></article></div>
        <div className="heading historyHeading"><div><small>ON-DEVICE ARCHIVE · UP TO 100</small><h2>Session history</h2></div><strong>{sessions.length}</strong></div>
        {sessions.length ? <div className="sessionList">{sessions.map((session) => <article key={session.id}><div><small>{new Date(session.startedAt).toLocaleString()}</small><h3>{session.bestTrick?.name || "Skate Session"}</h3><p>{session.tricks?.length || 0} tricks · {formatClock(session.duration)} · {Number(session.vertical || 0).toFixed(1)} ft vertical</p></div><b>{Number(session.totalScore || 0)}<small>PTS</small></b></article>)}</div> : <div className="empty"><b>✦</b><h3>NO SAVED SESSIONS YET</h3><p>Finished sessions stay on this device until browser/app data is removed.</p></div>}
      </section>}

      <footer>© 2026 Powered by Cactus🌵Byte Studios™</footer>

      {calibration.open ? <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="PocketStomp calibration"><div className="calibrationModal"><small>STEP {calibration.step + 1} OF 3</small><h2>{calibrationCopy.title}</h2><p>{calibrationCopy.text}</p><div className="progress"><i style={{ width: `${calibration.progress}%` }} /></div><button disabled={calibration.busy} onClick={() => runCalibrationStep(calibration.step)}>{calibration.busy ? "READING MOTION…" : calibration.step === 2 ? "CAPTURE POP & FINISH" : `CAPTURE ${calibrationCopy.title}`}</button><button className="cancel" disabled={calibration.busy} onClick={() => setCalibration({ open: false, step: 0, progress: 0, busy: false, result: null })}>CANCEL</button></div></div> : null}
    </main>
  );
}
