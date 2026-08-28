'use client';

import { useEffect, useState } from 'react';

const KEY='cbs_demo_seen:pocketstomp:1';
const DISMISS='cbs_demo_dismissed:pocketstomp:1';

const steps=[
  ['Set pop sensitivity','Before a run, adjust Pop Sensitivity. Lower values react more easily; higher values require a stronger motion spike.'],
  ['Grant phone permissions','Tap Start Session and allow motion/sensor and location access when your phone asks. GPS is used for speed.'],
  ['Secure the phone','Keep the phone firmly secured in a pocket before skating. PocketStomp reads phone motion, so loose movement can affect estimates.'],
  ['Start your run','Skate normally while the session is active. Current speed updates from GPS and detected motion events are added to the Trick Log.'],
  ['End and review','Tap End Run to stop sensor and GPS tracking. Review total points, average speed, best trick, trick grades and force readings.'],
  ['Share the session','Use Share Session to open your phone’s native share sheet when supported, or copy the summary on browsers without native sharing.'],
];

export default function DemoHelp(){
  const [open,setOpen]=useState(false);
  const [dontShow,setDontShow]=useState(false);

  useEffect(()=>{
    try{
      if(localStorage.getItem(KEY)!=='1'&&localStorage.getItem(DISMISS)!=='1'){
        const t=setTimeout(()=>{setOpen(true);localStorage.setItem(KEY,'1')},900);
        return()=>clearTimeout(t);
      }
    }catch{}
  },[]);

  function close(){
    try{if(dontShow)localStorage.setItem(DISMISS,'1')}catch{}
    setOpen(false);
  }

  return <>
    <button type="button" onClick={()=>setOpen(true)} aria-label="How to use PocketStomp" title="How to use PocketStomp" style={{position:'fixed',right:16,bottom:18,zIndex:40,width:46,height:46,borderRadius:15,border:'1px solid #355f4c',background:'#102019',color:'#fff',fontWeight:900,fontSize:18,boxShadow:'0 10px 30px #0008'}}>?</button>
    {open&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}} style={{position:'fixed',inset:0,zIndex:1000,background:'#000c',display:'flex',alignItems:'flex-end',justifyContent:'center',paddingTop:'env(safe-area-inset-top)'}}>
      <section role="dialog" aria-modal="true" aria-labelledby="pocketDemoTitle" style={{width:'min(100%,720px)',maxHeight:'92dvh',overflow:'auto',background:'#0b1410',color:'#f4faf6',border:'1px solid #315640',borderBottom:0,borderRadius:'28px 28px 0 0',padding:'18px 16px calc(24px + env(safe-area-inset-bottom))',boxShadow:'0 -24px 70px #0009'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><div style={{fontSize:10,letterSpacing:'.18em',color:'#7adfa5',fontWeight:900}}>POCKETSTOMP V2 · DEMO & HELP</div><h2 id="pocketDemoTitle" style={{margin:'4px 0 0',fontSize:22}}>How to use PocketStomp™</h2></div><button onClick={close} aria-label="Close help" style={{width:40,height:40,borderRadius:'50%',border:'1px solid #315640',background:'#12241b',color:'#fff',fontSize:22}}>×</button></div>
        <p style={{color:'#a4baae',fontSize:12,lineHeight:1.55}}>A quick field walkthrough for phone-based skate session tracking. PocketStomp is a beta estimator, not competition-grade telemetry.</p>
        <div style={{border:'1px dashed #315640',borderRadius:18,padding:16,background:'#0d1c15',color:'#9bb5a7',fontSize:12,lineHeight:1.5}}><strong style={{color:'#e7f5ec'}}>Demo video slot ready.</strong><br/>The written walkthrough works now; a recorded 60-second demo can be dropped in later.</div>
        <div style={{display:'grid',gap:9,marginTop:14}}>{steps.map((s,i)=><div key={s[0]} style={{border:'1px solid #294b39',borderRadius:16,padding:13,background:'#102019'}}><strong style={{display:'block',fontSize:13,color:'#52e08f'}}>{i+1}. {s[0]}</strong><span style={{display:'block',color:'#abc0b5',fontSize:11,lineHeight:1.45,marginTop:4}}>{s[1]}</span></div>)}</div>
        <div style={{marginTop:14,border:'1px solid #6d5421',borderRadius:15,padding:12,background:'#251d08',color:'#f7d982',fontSize:11,lineHeight:1.5}}><strong>Ride safely:</strong> keep the phone secure, stay aware of your surroundings, and skate within your ability. Sensor estimates can be wrong.</div>
        <label style={{display:'flex',gap:9,alignItems:'flex-start',marginTop:13,color:'#9bb5a7',fontSize:11,lineHeight:1.4}}><input type="checkbox" checked={dontShow} onChange={e=>setDontShow(e.target.checked)}/><span>Don’t show this automatically again. The ? button always reopens Help.</span></label>
        <button onClick={close} style={{width:'100%',marginTop:14,border:0,borderRadius:15,padding:13,fontWeight:900,background:'linear-gradient(135deg,#52e08f,#48d8d2)',color:'#052018'}}>START SKATING</button>
      </section>
    </div>}
  </>;
}
