'use client';

import { useEffect } from 'react';

export default function DemoHelp(){
  useEffect(()=>{
    if(document.querySelector('script[data-cactusbyte-demo="pocketstomp"]'))return;
    const script=document.createElement('script');
    script.src='https://cactusbyte-studios.vercel.app/demo-embed.js';
    script.dataset.cactusbyteDemo='pocketstomp';
    script.defer=true;
    document.body.appendChild(script);
  },[]);
  return null;
}
