'use client'
import React, { useRef, useEffect } from 'react';
import starboids from './starboids';
import Viewer3D from './Viewer3d';

export default function ThreeScene() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            starboids(canvasRef)
        }
    }, []);

    return <canvas className='playCanvas' ref={canvasRef} />;
};