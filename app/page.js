"use client";

import { useState, useRef } from 'react';
import { requestSensorAccess, stopSensorAccess } from '../utils/sensorProcessor';

export default function Home() {
  const [isTracking, setIsTracking] = useState(false);
  const [tricks, setTricks] = useState([]);
  const [threshold, setThreshold] = useState(15.0);
  
  // Speed tracking states
  const [currentSpeed, setCurrentSpeed] = useState("0.0");
  const speedSamples = useRef([]);
  const watchId = useRef(null);

  const handleStart = () => {
    // Clear previous session data
    setTricks([]);
    speedSamples.current = [];
    setCurrentSpeed("0.0");
    setIsTracking(true);

    requestSensorAccess(threshold, (newTrick) => {
      setTricks((prev) => [newTrick, ...prev]);
    });

    // Start GPS Speed Tracking
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const speedMs = position.coords.speed;
          // The Geolocation API returns speed in meters per second. 
          // If moving, convert to MPH.
          if (speedMs !== null) {
            const speedMph = speedMs * 2.23694;
            setCurrentSpeed(speedMph.toFixed(1));
            
            // Only log speeds above 1 MPH to the average so standing around isn't calculated
            if (speedMph > 1.0) {
              speedSamples.current.push(speedMph);
            }
          }
        },
        (error) => console.error("GPS Error:", error),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
  };

  const handleStop = () => {
    setIsTracking(false);
    stopSensorAccess();
    
    // Stop GPS tracking
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setCurrentSpeed("0.0");
  };

  // Calculate final average speed
  const averageSpeed = speedSamples.current.length > 0 
    ? (speedSamples.current.reduce((a, b) => a + b, 0) / speedSamples.current.length).toFixed(1)
    : "0.0";

  const handleShare = async () => {
    if (tricks.length === 0) return;
    
    const totalScore = tricks.reduce((sum, trick) => sum + parseFloat(trick.score), 0).toFixed(1);
    const bestTrick = tricks.reduce((max, trick) => parseFloat(trick.score) > parseFloat(max.score) ? trick : max, tricks[0]);
    
    const shareText = `🛹 PocketStomp Session!\nTotal Score: ${totalScore} pts\nAvg Speed: ${averageSpeed} MPH\nTricks Landed: ${tricks.length}\nBest Trick: ${bestTrick.name} (${bestTrick.score} pts)\n\nThink you can beat my run?`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My PocketStomp Session',
          text: shareText,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Session copied to clipboard! Ready to paste.");
    }
  };

  const getGradeColor = (grade) => {
    if (grade === 'S') return '#FFD700'; 
    if (grade === 'A') return '#4CAF50'; 
    if (grade === 'B') return '#2196F3'; 
    return '#9E9E9E'; 
  };

  const totalScore = tricks.reduce((sum, trick) => sum + parseFloat(trick.score), 0).toFixed(1);
  const bestTrick = tricks.length > 0 ? tricks.reduce((max, trick) => parseFloat(trick.score) > parseFloat(max.score) ? trick : max, tricks[0]) : null;

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', color: '#ffffff', backgroundColor: '#121212', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px', color: '#ffffff', letterSpacing: '1px' }}>🛹 PocketStomp</h1>
      
      {!isTracking && (
        <div style={{ backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #333' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', color: '#e0e0e0' }}>Pop Sensitivity: {threshold} m/s²</h3>
          <input 
            type="range" 
            min="5" 
            max="40" 
            step="0.5" 
            value={threshold} 
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#4CAF50' }}
          />
        </div>
      )}

      {/* Live Speedometer (Only shows while tracking) */}
      {isTracking && (
        <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #4CAF50', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '2px' }}>Current Speed</div>
          <div style={{ fontSize: '42px', fontWeight: '900', color: '#fff' }}>{currentSpeed} <span style={{fontSize: '18px', color: '#aaa'}}>MPH</span></div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {!isTracking ? (
          <button 
            onClick={handleStart} 
            style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '8px', border: 'none', width: '100%', fontWeight: 'bold' }}
          >
            Start Session
          </button>
        ) : (
          <button 
            onClick={handleStop} 
            style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#f44336', color: 'white', borderRadius: '8px', border: 'none', width: '100%', fontWeight: 'bold' }}
          >
            End Run
          </button>
        )}
      </div>

      {/* End of Session Summary & Share Button */}
      {!isTracking && tricks.length > 0 && (
        <div style={{ marginTop: '20px', backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #4CAF50', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>Session Complete</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0', borderTop: '1px solid #333', borderBottom: '1px solid #333', padding: '15px 0' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>{totalScore}</div>
              <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase' }}>Total Pts</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>{averageSpeed}</div>
              <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase' }}>Avg MPH</div>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '20px' }}>
            Best: <strong>{bestTrick.name}</strong> ({bestTrick.score} pts)
          </div>
          
          <button 
            onClick={handleShare}
            style={{ padding: '12px 20px', fontSize: '16px', backgroundColor: '#2196F3', color: 'white', borderRadius: '8px', border: 'none', width: '100%', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            📲 Share Session
          </button>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '20px', borderBottom: '2px solid #333', paddingBottom: '10px', color: '#e0e0e0' }}>Trick Log:</h2>
        {tricks.length === 0 && <p style={{ color: '#666' }}>Ready. Drop phone in pocket and skate.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tricks.map((trick, index) => (
            <li key={index} style={{ padding: '15px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '18px', color: '#fff' }}>{trick.name}</strong><br/>
                <span style={{ fontSize: '12px', color: '#888' }}>Force: {trick.force}m/s² | {trick.time}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: getGradeColor(trick.grade) }}>
                  {trick.grade}-Tier
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#aaa' }}>
                  {trick.score} pts
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
