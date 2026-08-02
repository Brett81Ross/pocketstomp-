"use client";

import { useState } from 'react';
import { requestSensorAccess, stopSensorAccess } from '../utils/sensorProcessor';

export default function Home() {
  const [isTracking, setIsTracking] = useState(false);
  const [tricks, setTricks] = useState([]);
  const [threshold, setThreshold] = useState(15.0);

  const handleStart = () => {
    setIsTracking(true);
    requestSensorAccess(threshold, (newTrick) => {
      setTricks((prev) => [newTrick, ...prev]);
    });
  };

  const handleStop = () => {
    setIsTracking(false);
    stopSensorAccess();
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', color: '#333' }}>
      <h1 style={{ textAlign: 'center' }}>🛹 PocketStomp</h1>
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Sensitivity: {threshold} m/s²</h3>
        <input 
          type="range" 
          min="5" 
          max="40" 
          step="0.5" 
          value={threshold} 
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          disabled={isTracking}
          style={{ width: '100%' }}
        />
        <p style={{ fontSize: '12px', color: '#666', marginBottom: 0 }}>
          Lower = highly sensitive. Higher = requires a harder stomp. 
          Stop the session to adjust.
        </p>
      </div>

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
            Stop Session
          </button>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Session Log:</h2>
        {tricks.length === 0 && <p style={{ color: '#888' }}>Ready. Drop phone in pocket and test the pop.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tricks.map((trick, index) => (
            <li key={index} style={{ padding: '15px', borderBottom: '1px solid #ddd', backgroundColor: index === 0 ? '#e8f5e9' : 'transparent', color: 'black' }}>
              <strong>{trick.name}</strong> - Force: {trick.force}m/s² <br/>
              <span style={{ fontSize: '12px', color: '#555' }}>{trick.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
