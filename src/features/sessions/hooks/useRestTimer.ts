import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';

const TICK_MS = 250;
const FINISH_VIBRATION = [0, 400, 200, 400];
const FINISH_SOUND = require('../../../../assets/rest-end.wav');

/**
 * Contagem regressiva baseada no horário de término (e não em um contador),
 * para continuar correta se o app ficar em segundo plano.
 */
export function useRestTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const playerRef = useRef<AudioPlayer | null>(null);

  // Aviso sonoro ao fim do descanso: a vibração sozinha não é percebida com fone.
  // Mistura com a música do usuário em vez de pausá-la.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(
      () => undefined,
    );
    const player = createAudioPlayer(FINISH_SOUND);
    playerRef.current = player;
    return () => {
      playerRef.current = null;
      player.release();
    };
  }, []);

  useEffect(() => {
    if (endsAt === null) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setEndsAt(null);
        Vibration.vibrate(FINISH_VIBRATION);
        const player = playerRef.current;
        if (player) {
          player.seekTo(0);
          player.play();
        }
      }
    };

    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    setTotal(seconds);
    setRemaining(seconds);
    setEndsAt(Date.now() + seconds * 1000);
  }, []);

  const addTime = useCallback((seconds: number) => {
    setTotal((current) => Math.max(1, current + seconds));
    // Ao diminuir além do que resta, termina agora (o tick encerra e vibra).
    setEndsAt((current) =>
      current === null ? current : Math.max(Date.now(), current + seconds * 1000),
    );
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
  }, []);

  return { isRunning: endsAt !== null, remaining, total, start, addTime, stop };
}
