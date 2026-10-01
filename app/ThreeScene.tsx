"use client";
import { useRef, useEffect, useState } from "react";
import starboids from "./starboids";

export default function ThreeScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  const initialized = useRef(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Preparing scene…");
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cleanup: (() => void) | undefined;

    if (typeof window !== "undefined") {
      starboids(canvasRef, uiCanvasRef, (percent, message) => {
        setLoadingProgress(percent);
        setLoadingMessage(message);
      })
        .then((cleanupFn) => {
          cleanup = cleanupFn;
        })
        .catch((error: unknown) => {
          console.error("Unable to start the Starboids scene", error);
          setLoadingError(true);
        });
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <>
      <canvas className="playCanvas" ref={canvasRef} />
      <canvas id="uiCanvas" className="uiCanvas" ref={uiCanvasRef} />
      {loadingError ? (
        <div className="sceneLoading" role="alert">
          <p className="sceneLoading__eyebrow">Starboids</p>
          <p className="sceneLoading__message">
            The scene couldn’t load. Please try again.
          </p>
          <button
            className="sceneLoading__retry"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      ) : loadingProgress < 100 ? (
        <div className="sceneLoading" role="status" aria-live="polite">
          <p className="sceneLoading__eyebrow">Starboids</p>
          <p className="sceneLoading__message">{loadingMessage}</p>
          <div
            className="sceneLoading__track"
            role="progressbar"
            aria-label="Loading the Starboids scene"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={loadingProgress}
          >
            <span style={{ width: `${loadingProgress}%` }} />
          </div>
          <p className="sceneLoading__percent">{loadingProgress}%</p>
        </div>
      ) : null}
    </>
  );
}
