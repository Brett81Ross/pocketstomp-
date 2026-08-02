"use client";

import { useState } from 'react';
import { requestSensorAccess, stopSensorAccess } from '../utils/sensorProcessor';

const TRICK_DICTIONARY = [
  "Ollie", "Nollie", "Fakie Ollie", "Switch Ollie",
  "Kickflip", "Heelflip", "Varial Kickflip", "Varial Heelflip",
  "Hardflip", "Inward Heelflip", "360 Flip (Tre Flip)", "Laser Flip",
  "Frontside 180", "Backside 180", "Frontside 360", "Backside 360",
  "Pop Shuvit", "Frontside Pop Shuvit", "360 Shuvit",
  "Impossible", "Hospital Flip", "Dolphin Flip"
];

export default function Home() {
  const [isTracking, setIsTracking] = useState(false);
  const [tricks, setTricks] = useState([]);
  const [threshold, setThreshold] = useState(15.0);
  const [selectedTrick, setSelectedTrick] = useState(TRICK_DICTIONARY[0]);

  const handleStart = () => {
    setIsTracking(true);
    requestSensorAccess(threshold, (sensorData) => {
      // Merge the user's called trick with the hardware sensor data
      const gradedTrick = { ...sensorData, name: selectedTrick };
      setTricks((prev) => [gradedTrick, ...prev]);
    });
  };

  const handleStop = () => {
    setIsTracking(false);
    stopSensorAccess();
  };

  // Helper to color-code the grades
  const getGradeColor = (grade) => {
    if (grade === 'S') return '#FFD700'; // Gold
    if (grade === 'A') return '#4CAF50'; // Green
    if (grade === 'B') return '#2196F3'; // Blue
    return '#9E9E9E'; // Grey for C
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', color: '#333' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>🛹 PocketStomp</h1>
      
      {!isTracking && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Call Your Trick:</label>
          <select 
            value={selectedTrick} 
            onChange={(e) => setSelectedTrick(e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#fff' }}
          >
            {TRICK_DICTIONARY.map(trick => (
              <option key={trick} value={trick}>{trick}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, fontSize: '16px' }}>Sensitivity: {threshold} m/s²</h3>
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
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {!isTracking ? (
          <button 
            onClick={handleStart} 
            style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '8px', border: 'none', width: '100%', fontWeight: 'bold' }}
          >
            Drop In (Start)
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

      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Session Scoreboard:</h2>
        {tricks.length === 0 && <p style={{ color: '#888' }}>Call a trick, drop phone in pocket, and test the grade.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tricks.map((trick, index) => (
            <li key={index} style={{ padding: '15px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '18px' }}>{trick.name}</strong><br/>
                <span style={{ fontSize: '12px', color: '#666' }}>Force: {trick.force}m/s² | {trick.time}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: getGradeColor(trick.grade) }}>
                  {trick.grade}-Tier
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
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
