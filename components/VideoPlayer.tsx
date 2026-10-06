"use client";

// One player for every kind of submission. Uploaded files and YouTube links support
// "what time is it now" and "jump to time", which is what timestamped comments need.
// TikTok's embed player reports time when it can; other links get general comments only.

import { useEffect, useRef, type RefObject } from "react";
import { tiktokId, youtubeId } from "@/lib/reviews";

export interface PlayerHandle {
  /** Current playback time in seconds, or null when this player can't tell. */
  getTime(): number | null;
  /** Video length in seconds, or null when unknown. */
  getDuration(): number | null;
  seek(t: number): void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytLoading: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  ytLoading ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytLoading;
}

export function VideoPlayer({
  kind,
  url,
  experienceId,
  handle,
}: {
  kind: "upload" | "youtube" | "tiktok" | "link";
  url: string;
  experienceId: string;
  handle: RefObject<PlayerHandle | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHost = useRef<HTMLDivElement>(null);
  const ttFrame = useRef<HTMLIFrameElement>(null);
  const ttTime = useRef<number | null>(null);
  const ttDuration = useRef<number | null>(null);

  const ytVideo = kind === "youtube" ? youtubeId(url) : null;
  const ttVideo = kind === "tiktok" ? tiktokId(url) : null;

  useEffect(() => {
    handle.current = { getTime: () => null, getDuration: () => null, seek: () => {} };

    if (kind === "upload") {
      handle.current = {
        getTime: () => videoRef.current?.currentTime ?? null,
        getDuration: () => {
          const d = videoRef.current?.duration;
          return d && Number.isFinite(d) ? d : null;
        },
        seek: (t) => {
          if (!videoRef.current) return;
          videoRef.current.currentTime = t;
          void videoRef.current.play().catch(() => {});
        },
      };
      return;
    }

    if (ytVideo && ytHost.current) {
      let player: any = null;
      let cancelled = false;
      const mount = document.createElement("div");
      ytHost.current.replaceChildren(mount);
      void loadYouTubeApi().then(() => {
        if (cancelled) return;
        player = new window.YT.Player(mount, { videoId: ytVideo, playerVars: { rel: 0, playsinline: 1 } });
      });
      handle.current = {
        getTime: () => (player?.getCurrentTime ? player.getCurrentTime() : null),
        getDuration: () => (player?.getDuration ? player.getDuration() || null : null),
        seek: (t) => {
          player?.seekTo?.(t, true);
          player?.playVideo?.();
        },
      };
      return () => {
        cancelled = true;
        player?.destroy?.();
      };
    }

    if (ttVideo) {
      ttTime.current = null;
      const onMessage = (e: MessageEvent) => {
        if (e.source !== ttFrame.current?.contentWindow) return;
        const d = typeof e.data === "string" ? safeJson(e.data) : e.data;
        if (d?.type === "onCurrentTime" && typeof d.value?.currentTime === "number") {
          ttTime.current = d.value.currentTime;
          if (typeof d.value.duration === "number") ttDuration.current = d.value.duration;
        }
      };
      window.addEventListener("message", onMessage);
      handle.current = {
        getTime: () => ttTime.current,
        getDuration: () => ttDuration.current,
        seek: (t) => {
          ttFrame.current?.contentWindow?.postMessage({ type: "seekTo", value: t, "x-tiktok-player": true }, "*");
          ttFrame.current?.contentWindow?.postMessage({ type: "play", "x-tiktok-player": true }, "*");
        },
      };
      return () => window.removeEventListener("message", onMessage);
    }
  }, [kind, url, ytVideo, ttVideo, handle]);

  if (kind === "upload") {
    const src = `${url}?e=${encodeURIComponent(experienceId)}`;
    return (
      <div className="player">
        <video ref={videoRef} src={src} controls playsInline preload="metadata" aria-label="Submitted video" />
      </div>
    );
  }
  if (ytVideo) {
    return (
      <div className={`player${url.includes("/shorts/") ? " vertical" : ""}`}>
        <div ref={ytHost} />
      </div>
    );
  }
  if (ttVideo) {
    return (
      <div className="player vertical">
        <iframe
          ref={ttFrame}
          src={`https://www.tiktok.com/player/v1/${ttVideo}?controls=1&progress_bar=1&timestamp=1`}
          allow="fullscreen; autoplay; encrypted-media"
          title="TikTok video"
        />
      </div>
    );
  }
  return (
    <div className="banner">
      <p>
        This link can&apos;t play inside Loopness.{" "}
        <a href={url} target="_blank" rel="noreferrer">
          Open the video
        </a>{" "}
        in a new tab, then type a time like 1:05 next to each comment.
      </p>
    </div>
  );
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
