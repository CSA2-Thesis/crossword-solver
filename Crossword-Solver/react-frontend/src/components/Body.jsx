import React, { useEffect, useRef } from "react";

function Body() {
  const animationRef = useRef();
  const baseTimeRef = useRef(0);
  const pathsRef = useRef([]);
  const rippleState = useRef({
    active: false,
    startTime: 0,
    timeAdjustment: 0,
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

  const getCurrentTime = (currentTime) => {
    if (!rippleState.current.active) {
      return currentTime + rippleState.current.timeAdjustment;
    }
    const elapsed = currentTime - rippleState.current.startTime;
    const progress = Math.min(elapsed / RIPPLE_CONFIG.duration, 1);
    const accelerationCurve = Math.sin(progress * Math.PI);
    const timeMultiplier = 1 + RIPPLE_CONFIG.intensity * accelerationCurve;
    const adjustedElapsed = elapsed * timeMultiplier;
    return rippleState.current.startTime + adjustedElapsed;
  };

  const generateWavePath = (wave, currentTime) => {
    const width = 1000;
    const height = 500;
    const segments = 60;
    const points = [];
    const time = getCurrentTime(currentTime) * 0.001;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width;
      const y =
        height * wave.heightOffset +
        wave.amplitude *
          Math.sin(x * wave.frequency + time * wave.baseSpeed + wave.offset);
      points.push(`${x},${y}`);
    }
    return `M ${points.join(" L ")} L ${width},${height} L 0,${height} Z`;
  };

  const animate = (time) => {
    if (document.body.classList.contains("modal-open")) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    if (!baseTimeRef.current) baseTimeRef.current = time;
    waves.forEach((wave, i) => {
      const path = generateWavePath(wave, time);
      if (pathsRef.current[i]) {
        pathsRef.current[i].setAttribute("d", path);
      }
    });
    animationRef.current = requestAnimationFrame(animate);
  };

  const triggerRipple = () => {
    const now = performance.now();
    rippleState.current = {
      active: true,
      startTime: now,
      timeAdjustment: rippleState.current.timeAdjustment,
    };
    setTimeout(() => {
      const elapsed = performance.now() - rippleState.current.startTime;
      const averageMultiplier = 1 + RIPPLE_CONFIG.intensity * 0.6366;
      rippleState.current.timeAdjustment += elapsed * (averageMultiplier - 1);
      rippleState.current.active = false;
    }, RIPPLE_CONFIG.duration);
  };

  useEffect(() => {
    const handleGlobalRipple = () => triggerRipple();
    document.addEventListener("triggerWaveRipple", handleGlobalRipple);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("triggerWaveRipple", handleGlobalRipple);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    // bg-[linear-gradient(to_bottom,#e0f2fe_0%,#bae6fd_30%,#7dd3fc_100%)]
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-non bg-white dark:bg-[#172030]">
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
      >
        {waves.map((wave, i) => (
          <path
            key={i}
            ref={(el) => (pathsRef.current[i] = el)}
            fill={wave.color}
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