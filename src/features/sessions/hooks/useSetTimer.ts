import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';

const TICK_MS = 250;
export const PREP_SECONDS = 3;
const FINISH_VIBRATION = [0, 400, 200, 400];
const BEEP_SOUND = require('../../../../assets/beep.wav');
const FINISH_SOUND = require('../../../../assets/rest-end.wav');

export interface SetTimerTarget {
  exerciseId: string;
  setIndex: number;
}

type Phase = 'prep' | 'running' | 'paused';

interface Active {
  target: SetTimerTarget;
  phase: Phase;
  /** Fim da fase atual (prep/running); em pausa vale `leftMs`. */
  endsAt: number;
  leftMs: number;
  seconds: number;
  /** Fase antes de pausar, para retomar do mesmo ponto. */
  resumePhase: 'prep' | 'running';
}

/**
 * Cronômetro de uma série por tempo: pré-contagem de 3 s, contagem regressiva e aviso
 * (vibração + bip) ao zerar. Baseado em horário de término, como o descanso, para não
 * derivar e continuar correto se o app ficar em segundo plano.
 */
export function useSetTimer(onDone: (target: SetTimerTarget) => void) {
  const [active, setActive] = useState<Active | null>(null);
  const [remaining, setRemaining] = useState(0);
  const beepRef = useRef<AudioPlayer | null>(null);
  const endRef = useRef<AudioPlayer | null>(null);
  const doneRef = useRef(onDone);
  const lastShown = useRef<number | null>(null);
  doneRef.current = onDone;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(
      () => undefined,
    );
    const beep = createAudioPlayer(BEEP_SOUND);
    const end = createAudioPlayer(FINISH_SOUND);
    beepRef.current = beep;
    endRef.current = end;
    return () => {
      beepRef.current = null;
      endRef.current = null;
      beep.release();
      end.release();
    };
  }, []);

  const play = (player: AudioPlayer | null) => {
    if (!player) return;
    player.seekTo(0);
    player.play();
  };

  const running = active !== null && active.phase !== 'paused';
  const phase = active?.phase;
  const endsAt = active?.endsAt;

  useEffect(() => {
    if (!running || endsAt === undefined) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);

      // Um bip curto a cada número da pré-contagem.
      if (phase === 'prep' && left > 0 && lastShown.current !== left) {
        lastShown.current = left;
        Vibration.vibrate(30);
        play(beepRef.current);
      }
      if (left > 0) return;

      lastShown.current = null;
      if (phase === 'prep') {
        Vibration.vibrate(200);
        play(endRef.current);
        const seconds = active?.seconds ?? 0;
        setRemaining(seconds);
        setActive((current) =>
          current && current.phase === 'prep'
            ? { ...current, phase: 'running', endsAt: Date.now() + seconds * 1000 }
            : current,
        );
        return;
      }

      Vibration.vibrate(FINISH_VIBRATION);
      play(endRef.current);
      const target = active?.target;
      setActive(null);
      if (target) doneRef.current(target);
    };

    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
    // `active` só é lido no instante do tick; a fase e o fim já estão nas dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, endsAt]);

  const start = useCallback((target: SetTimerTarget, seconds: number, skipPrep = false) => {
    lastShown.current = null;
    const prep = !skipPrep;
    const length = prep ? PREP_SECONDS : seconds;
    setRemaining(length);
    setActive({
      target,
      phase: prep ? 'prep' : 'running',
      endsAt: Date.now() + length * 1000,
      leftMs: length * 1000,
      seconds,
      resumePhase: prep ? 'prep' : 'running',
    });
  }, []);

  const pause = useCallback(() => {
    setActive((current) =>
      current && current.phase !== 'paused'
        ? {
            ...current,
            resumePhase: current.phase,
            phase: 'paused',
            leftMs: Math.max(0, current.endsAt - Date.now()),
          }
        : current,
    );
  }, []);

  const resume = useCallback(() => {
    setActive((current) =>
      current && current.phase === 'paused'
        ? { ...current, phase: current.resumePhase, endsAt: Date.now() + current.leftMs }
        : current,
    );
  }, []);

  const cancel = useCallback(() => {
    lastShown.current = null;
    setActive(null);
  }, []);

  return {
    target: active?.target ?? null,
    phase: active?.phase ?? null,
    remaining: active?.phase === 'paused' ? Math.ceil(active.leftMs / 1000) : remaining,
    start,
    pause,
    resume,
    cancel,
  };
}
