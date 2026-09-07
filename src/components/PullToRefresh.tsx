"use client";

import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pullDistance = Math.max(0, currentY - startY);
  const maxPull = 80;
  
  // Hanya izinkan pull down jika scrollTop = 0 (berada di paling atas)
  const isAtTop = containerRef.current ? containerRef.current.scrollTop <= 0 : true;
  const isPulling = pullDistance > 0 && isAtTop && startY > 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0 && containerRef.current && containerRef.current.scrollTop <= 0) {
      if (e.touches[0].clientY > startY) {
        setCurrentY(e.touches[0].clientY);
      } else {
        setStartY(0);
        setCurrentY(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 60 && !refreshing) {
      setRefreshing(true);
      window.location.reload();
    } else {
      setStartY(0);
      setCurrentY(0);
    }
  };

  const pullHeight = isPulling ? Math.min(pullDistance * 0.5, maxPull) : 0;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-end overflow-hidden transition-all pointer-events-none"
        style={{ 
          height: pullHeight, 
          transition: isPulling ? 'none' : 'height 0.3s ease-out',
          zIndex: 50
        }}
      >
        <div 
          className={`bg-white rounded-full p-2 shadow-md mb-4 ${refreshing ? 'animate-spin' : ''}`}
          style={{
            opacity: Math.min(pullHeight / 50, 1),
            transform: `scale(${Math.min(pullHeight / 50, 1)}) rotate(${pullHeight * 5}deg)`
          }}
        >
          <RefreshCw size={20} className="text-smk-blue" />
        </div>
      </div>
      
      <div 
        style={{ 
          transform: `translateY(${pullHeight}px)`, 
          transition: isPulling ? 'none' : 'transform 0.3s ease-out' 
        }}
        className="min-h-full"
      >
        {children}
      </div>
    </div>
  );
}
