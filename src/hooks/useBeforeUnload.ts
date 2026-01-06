import { useEffect } from 'react';

export function useBeforeUnload(shouldWarn: boolean, message?: string) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldWarn) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we set it anyway
        const defaultMessage = message || 'Hai una partita in corso. Sei sicuro di voler uscire?';
        e.returnValue = defaultMessage;
        return defaultMessage;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn, message]);
}
