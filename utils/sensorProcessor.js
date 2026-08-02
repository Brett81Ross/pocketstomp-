let activeListener = null;
let lastTriggerTime = 0;
let isRecordingAirtime = false;
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
    const gyro = event.rotationRate; 
    
    if (!acc || !gyro) return;

    const currentRoll = Math.abs(gyro.alpha || 0); 
    const currentYaw = Math.abs(gyro.gamma || 0);  

    if (isRecordingAirtime) {
      if (currentRoll > maxRoll) maxRoll = currentRoll;
      if (currentYaw > maxYaw) maxYaw = currentYaw;
      return; 
    }

    const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

    if (totalAcc > threshold) {
      const now = Date.now();
      
      if (now - lastTriggerTime > 1500) { 
        lastTriggerTime = now;
        isRecordingAirtime = true;
        
        maxRoll = 0;
        maxYaw = 0;

        setTimeout(() => {
          isRecordingAirtime = false;
          
          // Grading Math: Combine Pop Force and Rotation Speed
          let rawScore = (totalAcc * 1.5) + (maxRoll / 10) + (maxYaw / 10);
          
          // Cap score at 99.9 for realistic display
          let finalScore = Math.min(rawScore, 99.9).toFixed(1);
          
          // Assign Letter Grade
          let grade = "C";
          if (finalScore >= 85) grade = "S";       // S-Tier (Pro level pop)
          else if (finalScore >= 70) grade = "A";  // A-Tier (Clean)
          else if (finalScore >= 50) grade = "B";  // B-Tier (Average)

          onTrickDetected({
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
}
