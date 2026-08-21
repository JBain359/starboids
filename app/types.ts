import * as THREE from 'three'

export interface Boid {
    size: number
    color: THREE.Color
    wireframe: boolean
    position: THREE.Vector3
    rotation: THREE.Vector3
    velocity: THREE.Vector3
    speed: number
    nearestStarBody?: StarBody
    chassis: {
        geometry: THREE.BufferGeometry
        material: THREE.Material
    }
    wingL?: {
        geometry: THREE.BufferGeometry
        material: THREE.Material
    }
    wingR?: {
        geometry: THREE.BufferGeometry
        material: THREE.Material
    }
}

export interface StarBody {
    size: number
    color: THREE.Color
    terrainColor: THREE.Color
    seaLevel: number
    emissiveColor: THREE.Color
    atmosphereSize: number
    position: THREE.Vector3
    lightIntensity: number
    lightRange: number
    speed: number
    orbitingBodies: StarBody[]
    stars?: {
        numStars: number
        starRange: number
    }
}