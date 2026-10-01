"use client";

import { useState } from "react";
import ThreeScene from "./ThreeScene";

export default function StartScreen() {
  const [hasStarted, setHasStarted] = useState(false);

  if (hasStarted) {
    return <ThreeScene />;
  }

  return (
    <main className="startScreen">
      <section className="startScreen__content" aria-labelledby="game-title">
        <p className="startScreen__eyebrow">A living universe</p>
        <h1 id="game-title">
          STAR<span>BOIDS</span>
        </h1>
        <p className="startScreen__intro">
          Let loose a fleet among the stars and watch as your galaxy takes
          shape.
        </p>
        <button
          className="startScreen__button"
          onClick={() => setHasStarted(true)}
        >
          Start exploring <span aria-hidden="true">↗</span>
        </button>
        <p className="startScreen__hint">Use your mouse to explore the scene</p>
      </section>
      <p className="startScreen__edition">
        STARBOIDS <span>·</span> GALACTIC SANDBOX
      </p>
    </main>
  );
}
