import * as THREE from 'three'
import { Boid, StarBody } from './types'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { getFresnelMat } from './getFresnelMat';
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const gltfLoader = new GLTFLoader();

export default function getStarPoints({ numStars = 500, r = 2 } = {}) {
    function randomSpherePoint() {
        const radius = Math.random() * r + r
        const u = Math.random()
        const v = Math.random()

        const theta = 2 * Math.PI * u
        const phi = Math.acos(2 * v - 1)

        let x = radius * Math.sin(phi) * Math.cos(theta)
        let y = radius * Math.sin(phi) * Math.sin(theta)
        let z = radius * Math.cos(phi)


        return {
            pos: new THREE.Vector3(x, y, z),
            hue: .6,
            minDist: radius
        }
    }

    const verts = []
    const colors = []
    const positions = []
    let col;

    for (let i = 0; i < numStars; i++) {
        let p = randomSpherePoint()
        const { pos, hue } = p
        positions.push(p)

        col = new THREE.Color().setHSL(hue, .2, Math.random())
        verts.push(pos.x, pos.y, pos.z)
        colors.push(col.r, col.g, col.b)
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3))
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        map: new THREE.TextureLoader().load(
            './assets/circle.png'
        ),
        transparent: true
    })
    const points = new THREE.Points(geometry, material)
    return points
}

export const createBoidMesh = (b: Boid, group: THREE.Group) => {
    // Standard default material if model material isn't used
    const boidMaterial = new THREE.MeshStandardMaterial({
        color: b.color,
        wireframe: b.wireframe,
        metalness: .6,
        roughness: 0,
        side: 2
    });

    const boidMesh = new THREE.Mesh(b.chassis.geometry, boidMaterial);

    if (b.wingL) {
        const boidWingL = new THREE.Mesh(b.wingL.geometry, boidMaterial);
        boidWingL.position.x = -2
        boidWingL.position.y = .25
        boidWingL.position.z = 0
        boidWingL.userData.wing = true;
        boidMesh.add(boidWingL)
    }

    if (b.wingR) {
        const boidWingR = new THREE.Mesh(b.wingR.geometry, boidMaterial);
        boidWingR.position.x = 2
        boidWingR.position.y = .25
        boidWingR.position.z = 0
        boidWingR.scale.set(-1, 1, 1)
        boidWingR.userData.wing = true;
        boidMesh.add(boidWingR)
    }

    // Adjust scale according to imported model dimensions
    boidMesh.scale.setScalar(b.size);
    boidMesh.position.copy(b.position);

    group.add(boidMesh);
}

export const createStarBody = (body: StarBody, group: THREE.Object3D) => {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: body.color, emissive: body.color, emissiveIntensity: body.lightIntensity / 100, metalness: .1, roughness: 1, flatShading: true });
    const bodyGeometry = new THREE.IcosahedronGeometry(body.size, 1)
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)


    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: body.terrainColor, emissive: body.terrainColor, emissiveIntensity: body.lightIntensity / 100, metalness: .6, roughness: .5
    });

    const terrainGeometry = new THREE.IcosahedronGeometry(body.size, 3)

    // Prepare Perlin Noise generator
    const perlin = new ImprovedNoise();
    const positionAttribute = terrainGeometry.attributes.position;
    const vertex = new THREE.Vector3();

    const noiseScale = 10;  // Frequency of bumps
    const heightFactor = .25 * body.size // Amplitude of terrain peaks

    // Displace each vertex along its normal
    const seaHeight = Math.random() * body.seaLevel //uniformly descend each vertex into the sea
    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);

        // Get normalized direction vector (normal from sphere center)
        const normal = vertex.clone().normalize();

        // Sample 3D noise at the vertex position
        // perlin.noise returns -1.0 to 1.0
        const noiseVal = perlin.noise(
            vertex.x * noiseScale,
            vertex.y * noiseScale,
            vertex.z * noiseScale
        ) - seaHeight;

        // Displace original position outward along the normal
        const displacement = body.size + (noiseVal * heightFactor);
        vertex.copy(normal).multiplyScalar(displacement);

        // Write updated vector back to geometry
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Recalculate normals for correct lighting
    terrainGeometry.computeVertexNormals();
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial)

    const atmoMaterial = getFresnelMat({ facingHex: 0x000000, rimHex: body.color.getHex() });
    const atmoGeometry = BufferGeometryUtils.mergeGeometries([terrainGeometry, bodyGeometry]);
    const atmoMesh = new THREE.Mesh(atmoGeometry, atmoMaterial)
    atmoMesh.scale.multiplyScalar(1.015)

    bodyMesh.add(atmoMesh)
    bodyMesh.add(terrainMesh)

    bodyMesh.position.copy(body.position)

    const starLight = new THREE.PointLight(body.color, body.lightIntensity * 2, body.lightRange)
    starLight.position.copy(body.position)

    //add stars
    if (body.stars) {
        const stars = getStarPoints({ numStars: body.stars?.numStars, r: body.stars?.starRange });
        bodyMesh.add(stars)
    }

    bodyMesh.add(starLight)


    body.orbitingBodies.forEach((orb) => {
        const pivot = new THREE.Group();

        pivot.userData.orbitable = true;
        orb.position.y = 0;

        createStarBody(orb, pivot)
        pivot.rotation.setFromVector3(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), orb.position))
        bodyMesh.add(pivot)
    })

    group.add(bodyMesh)
}

export const loadCrocMesh = async (url: string) => {
    let retGeo: THREE.BufferGeometry;
    let retMat: THREE.Material | null = null;
    try {
        const loadedScene = await gltfLoader.loadAsync(url)
        let loadedMesh: THREE.Mesh | null = null;
        loadedScene.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !loadedMesh) {
                loadedMesh = child as THREE.Mesh;
            }
        });

        if (loadedMesh) {
            // Clone geometry so modifications won't mutate cached assets
            retGeo = (loadedMesh as THREE.Mesh).geometry.clone();

            // Optional: Standardize geometry center and orientation
            retGeo.center();

            // Use model's original material or keep your custom materials
            retMat = (loadedMesh as THREE.Mesh).material as THREE.Material<THREE.MaterialEventMap>;
        } else {
            retGeo = new THREE.ConeGeometry(0.1, 0.2, 3);
            retMat = new THREE.MeshBasicMaterial();
        }

        return { geometry: retGeo, material: retMat }
    } catch (err) {
        console.warn("Failed to load GLTF model, falling back to ConeGeometry", err);
        return {
            geometry: new THREE.ConeGeometry(0.1, 0.2, 3),
            material: new THREE.MeshBasicMaterial()
        }
    }
}