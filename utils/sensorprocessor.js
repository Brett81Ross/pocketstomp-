let activeListener = null;
let lastTriggerTime = 0;

export function requestSensorAccess(threshold, onTrickDetected) {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          startListening(threshold, onTrickDetected);
        } else {
          alert("Sensor permission denied.");
        }
      })
      .catch(console.error);
  } else {
    startListening(threshold, onTrickDetected);
  }
}

function startListening(threshold, onTrickDetected) {
  if (activeListener) {
    window.removeEventListener('devicemotion', activeListener);
  }

  activeListener = (event) => {
    const acc = event.acceleration;
    if (!acc) return;

    const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

    if (totalAcc > threshold) {
      const now = Date.now();
      if (now - lastTriggerTime > 1000) { 
        lastTriggerTime = now;
        onTrickDetected({
          name: "Pop Detected",
          force: totalAcc.toFixed(2),
          time: new Date().toLocaleTimeString()
        });
      }
    }
  };

  window.addEventListener('devicemotion', activeListener);
}

export function stopSensorAccess() {
  if (activeListener) {
    window.removeEventListener('devicemotion', activeListener);
    activeListener = null;
  }
}
