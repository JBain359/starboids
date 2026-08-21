'use client'
import React, { useRef, useEffect } from 'react';
import starboids from './starboids';
import Viewer3D from './Viewer3d';
import { div } from 'three/tsl';

export default function ThreeScene() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const uiCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            starboids(canvasRef, uiCanvasRef)
        }
    }, []);

    return <>
        <canvas className='playCanvas' ref={canvasRef} />;
        <canvas className='uiCanvas' ref={uiCanvasRef} />;
    </>
};