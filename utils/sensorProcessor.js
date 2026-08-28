let activeListener = null;
let lastTriggerTime = 0;
let isRecordingAirtime = false;

let maxRoll = 0, minRoll = 0;
let maxYaw = 0, minYaw = 0;

export function requestSensorAccess(threshold, onTrickDetected) {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    return DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          startListening(threshold, onTrickDetected);
          return true;
        }
        alert("Sensor permission denied.");
        return false;
      })
      .catch((error) => {
        console.error(error);
        alert("Sensor permission could not be enabled.");
        return false;
      });
  }
  startListening(threshold, onTrickDetected);
  return Promise.resolve(true);
}

function startListening(threshold, onTrickDetected) {
  if (activeListener) {
    window.removeEventListener('devicemotion', activeListener);
  }

  activeListener = (event) => {
    const acc = event.acceleration;
    const gyro = event.rotationRate;
    if (!acc || !gyro) return;

    const currentRoll = gyro.gamma || 0;
    const currentYaw = gyro.alpha || 0;

    if (isRecordingAirtime) {
      if (currentRoll > maxRoll) maxRoll = currentRoll;
      if (currentRoll < minRoll) minRoll = currentRoll;
      if (currentYaw > maxYaw) maxYaw = currentYaw;
      if (currentYaw < minYaw) minYaw = currentYaw;
      return;
    }

    const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

    if (totalAcc > threshold) {
      const now = Date.now();
      if (now - lastTriggerTime > 1500) {
        lastTriggerTime = now;
        isRecordingAirtime = true;
        maxRoll = 0; minRoll = 0;
        maxYaw = 0; minYaw = 0;

        setTimeout(() => {
          isRecordingAirtime = false;
          let domRoll = Math.abs(maxRoll) > Math.abs(minRoll) ? maxRoll : minRoll;
          let domYaw = Math.abs(maxYaw) > Math.abs(minYaw) ? maxYaw : minYaw;
          let rollMag = Math.abs(domRoll);
          let yawMag = Math.abs(domYaw);

          let trickName = "Ollie";
          let flipThreshold = 150;
          let spinThreshold = 150;

          if (rollMag > flipThreshold && yawMag > spinThreshold) {
             if (domRoll > 0 && domYaw > 0) trickName = "Hardflip / FS Flip";
             else if (domRoll > 0 && domYaw < 0) trickName = "360 Flip / Varial";
             else if (domRoll < 0 && domYaw < 0) trickName = "Inward Heel / BS Heel";
             else if (domRoll < 0 && domYaw > 0) trickName = "Laser Flip / Varial Heel";
          } else if (rollMag > flipThreshold) {
             if (domRoll > 0) trickName = "Kickflip";
             else trickName = "Heelflip";
          } else if (yawMag > spinThreshold) {
             if (domYaw > 0) trickName = "FS Shuvit / FS 180";
             else trickName = "Pop Shuvit / BS 180";
          }

          let popScore = totalAcc * 1.2;
          let spinScore = (rollMag + yawMag) / 45;
          let rawScore = popScore + spinScore;
          let finalScore = Math.min(rawScore, 99.9).toFixed(1);

          let grade = "C";
          if (finalScore >= 85) grade = "S";
          else if (finalScore >= 70) grade = "A";
          else if (finalScore >= 50) grade = "B";

          onTrickDetected({
            name: trickName,
            force: totalAcc.toFixed(2),
            score: finalScore,
            grade: grade,
            time: new Date().toLocaleTimeString()
          });
        }, 800);
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
  isRecordingAirtime = false;
}
