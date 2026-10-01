"use client";
import { useRef, useEffect } from "react";
import starboids from "./starboids";

export default function ThreeScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cleanup: (() => void) | undefined;

    if (typeof window !== "undefined") {
      starboids(canvasRef, uiCanvasRef).then((cleanupFn) => {
        cleanup = cleanupFn;
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
    </>
  );
}
