import { useState, useEffect, useRef, useCallback } from 'react';

export function useSimulation(initialSteps = []) {
  // Ensure simulationSteps is always an array
  const [simulationSteps, setSimulationSteps] = useState(() => {
    try {
      return Array.isArray(initialSteps) ? initialSteps : [];
    } catch (error) {
      console.error('Error initializing simulationSteps:', error);
      return [];
    }
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  
  const intervalRef = useRef(null);
  const simulationStepsRef = useRef(simulationSteps);

  // Update the ref when simulationSteps changes
  useEffect(() => {
    simulationStepsRef.current = Array.isArray(simulationSteps) ? simulationSteps : [];
  }, [simulationSteps]);

  const safeSetSimulationSteps = useCallback((steps) => {
    try {
      setSimulationSteps(Array.isArray(steps) ? steps : []);
    } catch (error) {
      console.error('Error setting simulation steps:', error);
      setSimulationSteps([]);
    }
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up interval if playing and we have valid steps
    if (isPlaying && simulationStepsRef.current && Array.isArray(simulationStepsRef.current) && simulationStepsRef.current.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          try {
            const steps = simulationStepsRef.current;
            if (!steps || !Array.isArray(steps) || steps.length === 0) {
              setIsPlaying(false);
              return prev;
            }
            
            if (prev >= steps.length - 1) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          } catch (error) {
            console.error('Error in simulation interval:', error);
            setIsPlaying(false);
            return prev;
          }
        });
      }, simulationSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, simulationSpeed]);

  const playPauseSimulation = useCallback(() => {
    try {
      if (!simulationSteps || !Array.isArray(simulationSteps) || simulationSteps.length === 0) {
        console.warn('No simulation steps available');
        return;
      }
      
      if (currentStep >= simulationSteps.length - 1) {
        setCurrentStep(0);
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error in playPauseSimulation:', error);
    }
  }, [currentStep, simulationSteps, isPlaying]);

  const restartSimulation = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const nextStep = useCallback(() => {
    try {
      if (!simulationSteps || !Array.isArray(simulationSteps) || simulationSteps.length === 0) {
        console.warn('No simulation steps available');
        return;
      }
      
      if (currentStep < simulationSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error in nextStep:', error);
    }
  }, [currentStep, simulationSteps]);

  const prevStep = useCallback(() => {
    try {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error in prevStep:', error);
    }
  }, [currentStep]);

  const handleStepChange = useCallback((step) => {
    try {
      if (!simulationSteps || !Array.isArray(simulationSteps) || simulationSteps.length === 0) {
        console.warn('No simulation steps available');
        return;
      }
      
      const safeStep = Math.max(0, Math.min(step, simulationSteps.length - 1));
      setCurrentStep(safeStep);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error in handleStepChange:', error);
    }
  }, [simulationSteps]);

  return {
    isPlaying,
    currentStep,
    simulationSpeed,
    simulationSteps,
    setSimulationSteps: safeSetSimulationSteps,
    setSimulationSpeed,
    playPauseSimulation,
    restartSimulation,
    nextStep,
    prevStep,
    handleStepChange
  };
}