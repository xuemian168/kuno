// Sound effect utilities

let audioContext: AudioContext | null = null;
let soundEnabled = true;

// Initialize audio context
const initAudioContext = () => {
  if (!audioContext && typeof window !== 'undefined' && window.AudioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

// Generate a simple success sound
export const playSuccessSound = () => {
  // Check if sound is enabled (from localStorage)
  if (!getSoundEnabled()) return;
  
  const context = initAudioContext();
  if (!context) return;

  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Create a pleasant "ding" sound
    oscillator.frequency.setValueAtTime(800, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.2);
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
};

// Set sound enabled state
export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('soundEffectsEnabled', enabled.toString());
  }
};

// Get sound enabled state
export const getSoundEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('soundEffectsEnabled');
    if (stored !== null) {
      soundEnabled = stored === 'true';
    }
  }
  return soundEnabled;
};

// Initialize sound settings from localStorage
export const initializeSoundSettings = () => {
  getSoundEnabled();
};