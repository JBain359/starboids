'use client'
import React, { useRef, useEffect } from 'react';
import starboids from './starboids';
import Viewer3D from './Viewer3d';
import { div } from 'three/tsl';

export default function ThreeScene() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const uiCanvasRef = useRef<HTMLCanvasElement>(null);
    const initialized = useRef(false);


    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        let cleanup: (() => void) | undefined;

        if (typeof window !== 'undefined') {
            starboids(canvasRef, uiCanvasRef).then((cleanupFn) => {
                cleanup = cleanupFn;
            })
        }

        return () => {
            if (cleanup) cleanup();
        };
    }, []);

    return <>
        <canvas className='playCanvas' ref={canvasRef} />;
        <canvas className='uiCanvas' ref={uiCanvasRef} />;
    </>
};