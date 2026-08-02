let activeListener = null;
let lastTriggerTime = 0;
let isRecordingAirtime = false;

// Variables to store the rotation data during the airtime window
let maxRoll = 0; 
let maxYaw = 0;

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
    const gyro = event.rotationRate; // This is the new Gyroscope data
    
    if (!acc || !gyro) return;

    // We take the absolute value so we don't have to worry about frontside vs backside yet
    const currentRoll = Math.abs(gyro.alpha || 0); // X-axis flip
    const currentYaw = Math.abs(gyro.gamma || 0);  // Z-axis spin

    // 1. ARE WE IN THE AIR?
    if (isRecordingAirtime) {
      // Keep track of the highest spin rates during the jump
      if (currentRoll > maxRoll) maxRoll = currentRoll;
      if (currentYaw > maxYaw) maxYaw = currentYaw;
      return; // Skip the pop detection while we are analyzing a trick
    }

    // 2. DETECT THE POP
    const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

    if (totalAcc > threshold) {
      const now = Date.now();
      
      if (now - lastTriggerTime > 1500) { // 1.5 second cooldown between tricks
        lastTriggerTime = now;
        isRecordingAirtime = true;
        
        // Reset rotation trackers for the new trick
        maxRoll = 0;
        maxYaw = 0;

        // 3. ANALYZE THE TRICK AFTER 800ms OF AIRTIME
        setTimeout(() => {
          isRecordingAirtime = false;
          let trickName = "Ollie"; // Default if no major spin is detected

          // Baseline classification algorithm
          // These numbers (200 and 150) are degrees-per-second thresholds that you will likely need to tune.
          if (maxRoll > 200 && maxYaw > 150) {
            trickName = "360 Flip / Varial"; 
          } else if (maxRoll > 200) {
            trickName = "Kickflip / Heelflip";
          } else if (maxYaw > 150) {
            trickName = "Pop Shuvit / 180";
          }

          onTrickDetected({
            name: trickName,
            force: totalAcc.toFixed(2),
            time: new Date().toLocaleTimeString()
          });

        }, 800); // 800 milliseconds airtime window
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
