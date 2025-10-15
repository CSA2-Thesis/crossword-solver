import React, { useEffect, useRef, useState } from "react";

function Body() {
  const animationRef = useRef();
  const baseTimeRef = useRef(0);
  const pathsRef = useRef([]);
  const rippleState = useRef({
    active: false,
    startTime: 0,
    timeAdjustment: 0,
  });
  
  // Use a simpler, more reliable state structure
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: 1000,
    height: 500,
    waveHeight: 500,
    amplitudeScale: 1.0
  });

  const RIPPLE_CONFIG = {
    intensity: 4.0,
    duration: 800,
    opacityBoost: 0.2,
  };

  const waves = [
    {
      color: "rgba(248, 168, 213, 0.7)",
      amplitude: 80,
      frequency: 0.006,
      baseSpeed: 4,
      offset: 60,
      heightOffset: 0.7,
    },
    {
      color: "rgba(255, 215, 0, 0.5)",
      amplitude: 80,
      frequency: 0.0055,
      baseSpeed: 3.5,
      offset: 90,
      heightOffset: 0.75,
    },
    {
      color: "rgba(138, 43, 226, 0.7)",
      amplitude: 80,
      frequency: 0.005,
      baseSpeed: 3,
      offset: 120,
      heightOffset: 0.8,
    },
  ];

  // Ultra-safe number validation
  const isValidNumber = (value) => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value) && value !== 0;
  };

  // Safe dimension calculation
  const calculateDimensions = () => {
    try {
      const width = window?.innerWidth || 1000;
      const height = window?.innerHeight || 500;
      
      if (!isValidNumber(width) || !isValidNumber(height)) {
        return { width: 1000, height: 500, waveHeight: 500, amplitudeScale: 1.0 };
      }
      
      let waveHeight, amplitudeScale;
      
      if (width < 640) {
        waveHeight = Math.max(300, height * 0.6);
        amplitudeScale = 0.6;
      } else if (width < 1024) {
        waveHeight = Math.max(400, height * 0.7);
        amplitudeScale = 0.8;
      } else {
        waveHeight = Math.max(500, height * 0.8);
        amplitudeScale = 1.0;
      }
      
      return {
        width: Math.max(1000, width),
        height: height,
        waveHeight: waveHeight,
        amplitudeScale: amplitudeScale
      };
    } catch (error) {
      console.error('Dimension calculation error:', error);
      return { width: 1000, height: 500, waveHeight: 500, amplitudeScale: 1.0 };
    }
  };

  useEffect(() => {
    // Initialize dimensions immediately
    const initialDimensions = calculateDimensions();
    setDimensions(initialDimensions);
    setIsReady(true);

    const handleResize = () => {
      const newDimensions = calculateDimensions();
      setDimensions(newDimensions);
    };

    // Debounced resize handler
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Simplified wave generation with maximum safety
  const generateWavePath = (wave, currentTime) => {
    try {
      const { width, waveHeight, amplitudeScale } = dimensions;
      
      // Return safe default if dimensions are invalid
      if (!isValidNumber(width) || !isValidNumber(waveHeight) || !isValidNumber(amplitudeScale)) {
        return "M 0,400 L 1000,400 L 1000,500 L 0,500 Z";
      }
      
      // Ultra-safe time calculation
      const time = (currentTime || 0) * 0.001;
      if (!isValidNumber(time)) {
        return "M 0,400 L 1000,400 L 1000,500 L 0,500 Z";
      }
      
      const amplitude = wave.amplitude * amplitudeScale;
      const baseY = waveHeight * wave.heightOffset;
      
      // Generate simple sine wave points
      const points = [];
      const segments = Math.min(30, Math.floor(width / 30)); // Reduced for performance
      
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width;
        const waveY = amplitude * Math.sin((x * wave.frequency) + (time * wave.baseSpeed) + wave.offset);
        const y = baseY + waveY;
        
        // Double-check coordinates
        if (isValidNumber(x) && isValidNumber(y)) {
          points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }
      }
      
      if (points.length === 0) {
        return "M 0,400 L 1000,400 L 1000,500 L 0,500 Z";
      }
      
      // Create closed wave path
      return `M ${points.join(" L ")} L ${width},${waveHeight * 1.2} L 0,${waveHeight * 1.2} Z`;
    } catch (error) {
      console.error('Wave generation error:', error);
      return "M 0,400 L 1000,400 L 1000,500 L 0,500 Z"; // Safe fallback
    }
  };

  const animate = (time) => {
    // Validate time parameter
    if (!isValidNumber(time)) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    if (!baseTimeRef.current) baseTimeRef.current = time;

    try {
      waves.forEach((wave, i) => {
        const path = generateWavePath(wave, time);
        if (pathsRef.current[i]) {
          pathsRef.current[i].setAttribute("d", path);
        }
      });
    } catch (error) {
      console.error('Animation error:', error);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const triggerRipple = () => {
    try {
      const now = performance.now();
      if (!isValidNumber(now)) return;
      
      rippleState.current = {
        active: true,
        startTime: now,
        timeAdjustment: rippleState.current.timeAdjustment,
      };
      
      setTimeout(() => {
        const elapsed = performance.now() - rippleState.current.startTime;
        if (!isValidNumber(elapsed)) return;
        
        const averageMultiplier = 1 + RIPPLE_CONFIG.intensity * 0.6366;
        rippleState.current.timeAdjustment += elapsed * (averageMultiplier - 1);
        rippleState.current.active = false;
      }, RIPPLE_CONFIG.duration);
    } catch (error) {
      console.error('Ripple error:', error);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    const handleGlobalRipple = () => triggerRipple();
    document.addEventListener("triggerWaveRipple", handleGlobalRipple);
    
    // Start animation with validation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("triggerWaveRipple", handleGlobalRipple);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isReady, dimensions]);

  // Show loading state until ready
  if (!isReady) {
    return (
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900" />
    );
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-white dark:bg-[#172030]">
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.waveHeight}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {waves.map((wave, i) => (
          <path
            key={i}
            ref={(el) => (pathsRef.current[i] = el)}
            fill={wave.color}
            d="M 0,400 L 1000,400 L 1000,500 L 0,500 Z" // Safe initial path
            style={{
              transition: `d ${RIPPLE_CONFIG.duration / 2}ms ease-out`,
              opacity: rippleState.current.active
                ? 0.7 + RIPPLE_CONFIG.opacityBoost
                : 0.7,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default Body;