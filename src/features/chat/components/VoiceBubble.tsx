import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons';

export interface VoiceBubbleProps {
  url: string;
  durationMs: number;
}

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function VoiceBubble({ url, durationMs }: VoiceBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentMs(audio.currentTime * 1000);
    };

    const handleEnded = () => {
      setPlaying(false);
      setCurrentMs(0);
    };

    const handlePause = () => {
      setPlaying(false);
    };

    const handlePlay = () => {
      setPlaying(true);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  const togglePlay = (e: MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  const handleTrackClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const track = trackRef.current;
    const audio = audioRef.current;
    if (!track || !audio || durationMs <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMs = ratio * durationMs;
    audio.currentTime = targetMs / 1000;
    setCurrentMs(targetMs);
  };

  const pct = durationMs > 0 ? Math.min(100, Math.max(0, (currentMs / durationMs) * 100)) : 0;

  return (
    <div className="voice-bubble">
      <audio ref={audioRef} src={url} preload="metadata" style={{ display: 'none' }} />
      <Button
        type="text"
        shape="circle"
        icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
        className="voice-play-btn"
        onClick={togglePlay}
      />
      <div className="voice-track" ref={trackRef} onClick={handleTrackClick}>
        <div className="voice-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="voice-time">
        {formatMs(currentMs)} / {formatMs(durationMs)}
      </span>
    </div>
  );
}
