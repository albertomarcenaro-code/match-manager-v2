import { useState, useCallback, useEffect, useRef } from 'react';

const TIMER_STORAGE_KEY = 'match-timer-state';

interface TimerState {
  startTimestamp: number | null; // When the timer was started (Date.now())
  pausedAt: number | null; // Elapsed seconds when paused
  isRunning: boolean;
  isPaused: boolean;
}

const loadTimerState = (): TimerState | null => {
  try {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load timer state:', e);
    return null;
  }
};

const saveTimerState = (state: TimerState) => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save timer state:', e);
  }
};

export const clearTimerState = () => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear timer state:', e);
  }
};

export function useTimestamp(periodDuration: number) {
  const [timerState, setTimerState] = useState<TimerState>(() => {
    return loadTimerState() || {
      startTimestamp: null,
      pausedAt: null,
      isRunning: false,
      isPaused: false,
    };
  });
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioPlayedRef = useRef<boolean>(false);

  // Calculate elapsed time from timestamp
  const calculateElapsed = useCallback(() => {
    if (timerState.isPaused && timerState.pausedAt !== null) {
      return timerState.pausedAt;
    }
    if (timerState.isRunning && timerState.startTimestamp) {
      return Math.floor((Date.now() - timerState.startTimestamp) / 1000);
    }
    return 0;
  }, [timerState]);

  // Update elapsed time on interval
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      // Initial calculation
      setElapsedTime(calculateElapsed());
      
      intervalRef.current = window.setInterval(() => {
        const elapsed = calculateElapsed();
        setElapsedTime(elapsed);

        // Play audio when period ends
        const periodSeconds = periodDuration * 60;
        if (elapsed >= periodSeconds && !audioPlayedRef.current) {
          audioPlayedRef.current = true;
          playEndPeriodAlert();
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.isPaused, calculateElapsed, periodDuration]);

  // Persist timer state
  useEffect(() => {
    saveTimerState(timerState);
  }, [timerState]);

  // On mount, check if timer was running and restore
  useEffect(() => {
    const saved = loadTimerState();
    if (saved && saved.isRunning && !saved.isPaused && saved.startTimestamp) {
      setElapsedTime(Math.floor((Date.now() - saved.startTimestamp) / 1000));
    } else if (saved && saved.isPaused && saved.pausedAt !== null) {
      setElapsedTime(saved.pausedAt);
    }
  }, []);

  const playEndPeriodAlert = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (startTime: number, frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      playBeep(audioContext.currentTime, 800, 0.15);
      playBeep(audioContext.currentTime + 0.2, 1000, 0.15);
      playBeep(audioContext.currentTime + 0.4, 1200, 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const startTimer = useCallback(() => {
    audioPlayedRef.current = false;
    setTimerState({
      startTimestamp: Date.now(),
      pausedAt: null,
      isRunning: true,
      isPaused: false,
    });
    setElapsedTime(0);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      pausedAt: calculateElapsed(),
      isPaused: true,
    }));
  }, [calculateElapsed]);

  const resumeTimer = useCallback(() => {
    setTimerState(prev => {
      const pausedElapsed = prev.pausedAt || 0;
      return {
        ...prev,
        startTimestamp: Date.now() - (pausedElapsed * 1000),
        pausedAt: null,
        isPaused: false,
      };
    });
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState({
      startTimestamp: null,
      pausedAt: null,
      isRunning: false,
      isPaused: false,
    });
    setElapsedTime(0);
    clearTimerState();
  }, []);

  const resetAudioFlag = useCallback(() => {
    audioPlayedRef.current = false;
  }, []);

  return {
    elapsedTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetAudioFlag,
  };
}
