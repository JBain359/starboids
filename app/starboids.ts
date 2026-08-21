import * as THREE from "three";
import { Pane } from "tweakpane";
import { HDRLoader, OrbitControls } from "three/examples/jsm/Addons.js";
import RandomWeightedChoice from "./randomWeighted";
import { Boid, StarBody } from './types';
import { createBoidMesh, createStarBody, loadCrocMesh } from './starfield';

// Pre-allocated Vector Scratchpad (Eliminates GC in render loop)
const _orbitAxis = new THREE.Vector3();
const _steering = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _facingUser = new THREE.Vector3(0, 0, 1);
const _zeroVector = new THREE.Vector3();
const _pushAway = new THREE.Vector3();
const _influence = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _cameraLookTarget = new THREE.Vector3();
const _playerTarget = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _v1 = new THREE.Vector3();

// Static allocations for boid generation
const SHIP_WEIGHTS = { 0: 80, 1: 20 };

export default async function starboids(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    if (!canvasRef.current) return;

    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed[e.code] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initialize scene
    const scene = new THREE.Scene();
    const pane = new Pane();

    const cameraPane = pane.addFolder({ title: 'Camera', expanded: false });
    const behaviorPane = pane.addFolder({ title: 'Boid Behavior', expanded: false });

    const behaviorParams = {
        numBoids: 200,
        friendliness: 0.35,
        friendlyStrength: 1,
        friendlinessRange: 5,
        friendlyDot: 0.6,
        windDot: -0.1,
        personalSpaceDot: -0.1,
        personalSpaceMaxDistance: 5,
        bound: 10,
        boundPadding: 1.5,
        steeringStrength: 0.02,
        speed: 0.05
    };

    const cameraParams = {
        trailing: 0.02,
        offset: new THREE.Vector3(0, -0.25, 0),
        cinematicMode: true
    };

    // Tweakpane Bindings
    behaviorPane.addBinding(behaviorParams, 'numBoids', { min: 0, max: 200, step: 1 });
    behaviorPane.addBinding(behaviorParams, 'friendliness', { min: 0, max: 1, step: 0.05 });
    behaviorPane.addBinding(behaviorParams, 'friendlyStrength', { min: 0, max: 2, step: 0.05 });
    behaviorPane.addBinding(behaviorParams, 'friendlinessRange', { min: 0, max: 5, step: 0.1 });
    behaviorPane.addBinding(behaviorParams, 'friendlyDot', { min: -1, max: 1, step: 0.1 });
    behaviorPane.addBinding(behaviorParams, 'windDot', { min: -1, max: 1, step: 0.1 });
    behaviorPane.addBinding(behaviorParams, 'personalSpaceMaxDistance', { min: 0, max: 10, step: 0.1 });
    behaviorPane.addBinding(behaviorParams, 'personalSpaceDot', { min: -1, max: 1, step: 0.1 });
    behaviorPane.addBinding(behaviorParams, 'bound', { min: 1, max: 20, step: 1 });
    behaviorPane.addBinding(behaviorParams, 'boundPadding', { min: 0, max: behaviorParams.bound, step: 0.5 });
    behaviorPane.addBinding(behaviorParams, 'steeringStrength', { min: -1, max: 2, step: 0.05 });
    behaviorPane.addBinding(behaviorParams, 'speed', { min: 0, max: 1, step: 0.05 });

    cameraPane.addBinding(cameraParams, 'trailing', { min: 0, max: 1, step: 0.0005 });
    cameraPane.addBinding(cameraParams, 'offset', {
        x: { min: -1, max: 1, step: 0.05 },
        y: { min: -1, max: 1, step: 0.05 },
        z: { min: -1, max: 1, step: 0.05 }
    });
    cameraPane.addBinding(cameraParams, 'cinematicMode');

    // Load HDR Environment
    const hdrLoader = new HDRLoader();
    const hdr = await hdrLoader.loadAsync('./assets/lonely_road_afternoon_puresky_4k.hdr');
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;

    // Load Meshes in Parallel
    const meshUrls = [
        './assets/BoidCraft_Chassis.gltf',
        './assets/BoidCraft_Wing.gltf',
        './assets/BoidCraftSpeedy.gltf'
    ];
    const [chassis, wing, speedy] = await Promise.all(meshUrls.map(loadCrocMesh));

    const shipTypes = [
        { size: 0.1, wingL: wing, wingR: wing, chassis: chassis, color: new THREE.Color('white'), speed: behaviorParams.speed },
        { size: 0.25, wingL: undefined, wingR: undefined, chassis: speedy, color: new THREE.Color("rgb(37, 69, 139)"), speed: behaviorParams.speed * 1.5 }
    ];

    // Initialize Leader Boid
    const boids: Boid[] = [{
        size: 0.1,
        color: new THREE.Color(0xffa800),
        wireframe: false,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
        velocity: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(),
        speed: behaviorParams.speed,
        wingL: wing,
        wingR: wing,
        chassis: chassis
    }];

    const starBodies: StarBody[] = [{
        size: 1,
        color: new THREE.Color(0x46ACC2),
        terrainColor: new THREE.Color(0x2B9720),
        emissiveColor: new THREE.Color(0xffa800),
        seaLevel: 0.25,
        atmosphereSize: 15,
        position: new THREE.Vector3(0, 0, 0),
        lightIntensity: 20,
        lightRange: 40,
        speed: 1,
        stars: { numStars: 500, starRange: 10 },
        orbitingBodies: [{
            size: 0.3,
            seaLevel: 0,
            atmosphereSize: 0,
            color: new THREE.Color(0xBBC7CE),
            terrainColor: new THREE.Color(0xBBC7CE),
            emissiveColor: new THREE.Color(0xffffff),
            position: new THREE.Vector3(3, 0, 3),
            lightIntensity: 10,
            lightRange: 40,
            speed: 0.01,
            orbitingBodies: []
        }]
    }];

    const allStarBodies = new THREE.Group();
    const allBoids = new THREE.Group();

    starBodies.forEach((body) => createStarBody(body, allStarBodies));
    boids.forEach((boid) => createBoidMesh(boid, allBoids));

    // Camera Setup
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 200);
    const cameraBoid = allBoids.children[0] as THREE.Object3D;
    camera.position.copy(cameraBoid.position);

    scene.add(allBoids);
    scene.add(allStarBodies);

    // Renderer Setup
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    const confirmBoidCount = () => {
        const numBoidsWPlayer = behaviorParams.numBoids + 1;

        while (numBoidsWPlayer < boids.length) {
            boids.pop();
            const b = allBoids.children.pop() as THREE.Mesh;
            if (!b) return;
            b.geometry?.dispose();
            if (Array.isArray(b.material)) {
                b.material.forEach(m => m.dispose());
            } else {
                b.material?.dispose();
            }
        }

        while (numBoidsWPlayer > allBoids.children.length) {
            const typeIdx = parseInt(RandomWeightedChoice(SHIP_WEIGHTS));
            const b = {
                wireframe: false,
                position: new THREE.Vector3(
                    Math.random() * behaviorParams.bound * 2 - behaviorParams.bound,
                    Math.random() * behaviorParams.bound * 2 - behaviorParams.bound,
                    Math.random() * behaviorParams.bound * 2 - behaviorParams.bound
                ).add(cameraBoid.position),
                rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
                velocity: new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50).normalize(),
                ...shipTypes[typeIdx]
            };
            boids.push(b);
            createBoidMesh(b, allBoids);
        }
    };

    const generateRandomStarBody = (position: THREE.Vector3, size: number, moons: number = 0): StarBody => {
        const bodySize = Math.random() * size / 2;
        const color = new THREE.Color(Math.random(), Math.random(), Math.random());
        const terrainColor = new THREE.Color(Math.random(), Math.random(), Math.random());

        return {
            size: bodySize,
            color,
            terrainColor,
            emissiveColor: color,
            seaLevel: Math.random(),
            atmosphereSize: Math.random() * 100,
            position,
            lightIntensity: Math.random() * 100,
            lightRange: Math.random() * 100,
            speed: Math.random() * 0.01 - 0.02,
            stars: moons > 0 ? { numStars: 250, starRange: 10 } : { numStars: 0, starRange: 0 },
            orbitingBodies: Array.from({ length: moons }, () =>
                generateRandomStarBody(
                    new THREE.Vector3(Math.random(), Math.random(), Math.random())
                        .multiplyScalar(bodySize)
                        .addScalar(Math.random() * 5),
                    bodySize
                )
            )
        };
    };

    const expandStarBodies = (star: StarBody) => {
        const numNewStars = 2 * Math.random();
        for (let i = 0; i < numNewStars; i++) {
            const newStarDistance = (5 * Math.random() - 5) + behaviorParams.bound * 2;
            const pos = new THREE.Vector3(
                2 * Math.random() - 1,
                2 * Math.random() - 1,
                2 * Math.random() - 1
            ).normalize().multiplyScalar(newStarDistance).add(star.position);

            const newStarBody = generateRandomStarBody(pos, 3, 3 * Math.random());
            starBodies.push(newStarBody);
            createStarBody(newStarBody, allStarBodies);
        }
    };

    const exploredStarBodies: StarBody[] = [];
    let animFrameId: number;

    const renderloop = () => {
        confirmBoidCount();

        // Camera Positioning
        _offset.copy(boids[0].velocity).multiplyScalar(-0.05).add(cameraParams.offset);
        _targetCamPos.copy(cameraBoid.position).add(_offset);
        camera.position.lerp(_targetCamPos, cameraParams.trailing);

        _lookTarget.copy(cameraBoid.position).addScaledVector(boids[0].velocity, 0.5);
        camera.lookAt(_lookTarget);

        _cameraLookTarget.copy(_lookTarget);
        camera.worldToLocal(_cameraLookTarget);

        if (keysPressed['ArrowUp']) _cameraLookTarget.y += 1;
        if (keysPressed['ArrowDown']) _cameraLookTarget.y -= 1;
        if (keysPressed['ArrowLeft']) _cameraLookTarget.x -= 1;
        if (keysPressed['ArrowRight']) _cameraLookTarget.x += 1;

        // Rotate Orbiting Bodies
        const starBodyChildren = allStarBodies.children;
        for (let index = 0; index < starBodyChildren.length; index++) {
            const body = starBodyChildren[index] as THREE.Group;
            const myStarBodyObject = starBodies[index];

            const children = body.children;
            let orbitableIndex = 0
            for (let ci = 0; ci < children.length; ci++) {
                const child = children[ci] as THREE.Mesh;
                if (!child.userData.orbitable) continue;

                child.rotation.y += myStarBodyObject.orbitingBodies[orbitableIndex].speed
                orbitableIndex += 1;

            }
        }

        let focusedStarBody = boids[0].nearestStarBody;
        const boidChildren = allBoids.children;
        const pSpaceMaxDist = behaviorParams.personalSpaceMaxDistance;
        const pSpaceMaxDistSq = pSpaceMaxDist * pSpaceMaxDist;

        // Boid Logic Loop
        for (let index = 0; index < boidChildren.length; index++) {
            const boidMesh = boidChildren[index] as THREE.Group;
            const myBoidObject = boids[index];

            _steering.set(0, 0, 0);
            _forward.copy(myBoidObject.velocity).normalize();

            let starDistanceSq = Infinity;

            // 1. Star Avoidance
            for (let sbi = 0; sbi < starBodyChildren.length; sbi++) {
                const starMesh = starBodyChildren[sbi];
                const myStarBodyObject = starBodies[sbi];

                _diff.subVectors(starMesh.position, boidMesh.position);
                const distSq = _diff.lengthSq();

                if (distSq < starDistanceSq) {
                    starDistanceSq = distSq;
                    myBoidObject.nearestStarBody = myStarBodyObject;
                }

                const avoidRadius = myStarBodyObject.size * 5;
                if (distSq < avoidRadius * avoidRadius) {
                    const dist = Math.sqrt(distSq);
                    _pushAway.copy(_diff).negate().normalize();
                    _pushAway.multiplyScalar(((avoidRadius - dist) / myStarBodyObject.size) * 1.5);
                    _steering.add(_pushAway);
                }
            }

            // 2. Boid-to-Boid Interactions
            for (let obi = 0; obi < boidChildren.length; obi++) {
                if (index === obi) continue;

                const otherBoidMesh = boidChildren[obi];
                const myOtherBoidObject = boids[obi];

                _v1.copy(otherBoidMesh.position).add(myOtherBoidObject.velocity);
                _diff.subVectors(_v1, boidMesh.position);

                const distSq = _diff.lengthSq();
                if (distSq === 0) continue;

                const dist = Math.sqrt(distSq);
                _v1.copy(_diff).divideScalar(dist); // Normalized diff
                const dot = _forward.dot(_v1);

                // Friendly Attraction
                if (
                    myBoidObject.chassis.geometry === myOtherBoidObject.chassis.geometry &&
                    dot > behaviorParams.friendlyDot &&
                    dist < behaviorParams.friendlinessRange &&
                    Math.abs(index - obi) < behaviorParams.numBoids * behaviorParams.friendliness
                ) {
                    _steering.addScaledVector(_v1, behaviorParams.friendlyStrength * dist);
                }

                // Separation & Alignment
                if (distSq < pSpaceMaxDistSq) {
                    const factor = (pSpaceMaxDist - dist) / pSpaceMaxDist;

                    if (dot > behaviorParams.personalSpaceDot) {
                        _pushAway.copy(_v1).negate().multiplyScalar(factor);
                        _steering.add(_pushAway);
                    }

                    if (dot > behaviorParams.windDot) {
                        _influence.copy(myOtherBoidObject.velocity).multiplyScalar(factor);
                        _steering.add(_influence);
                    }
                }
            }

            // 3. Boundary Avoidance
            const nearestStarPos = myBoidObject.nearestStarBody?.position ?? _zeroVector;
            const pad = behaviorParams.boundPadding;
            const b = behaviorParams.bound;

            if (b - Math.abs(nearestStarPos.x - boidMesh.position.x) < pad) _steering.x -= Math.sign(boidMesh.position.x) * Math.abs(boidMesh.position.x) * 50;
            if (b - Math.abs(nearestStarPos.y - boidMesh.position.y) < pad) _steering.y -= Math.sign(boidMesh.position.y) * Math.abs(boidMesh.position.y) * 50;
            if (b - Math.abs(nearestStarPos.z - boidMesh.position.z) < pad) _steering.z -= Math.sign(boidMesh.position.z) * Math.abs(boidMesh.position.z) * 50;

            // 4. Movement Execution
            const isPlayerKey = keysPressed['ArrowUp'] || keysPressed['ArrowDown'] || keysPressed['ArrowLeft'] || keysPressed['ArrowRight'];

            if (isPlayerKey && index === 0) {
                _playerTarget.copy(camera.localToWorld(_cameraLookTarget));
                _steering.subVectors(_playerTarget, _lookTarget).normalize().multiplyScalar(behaviorParams.steeringStrength);
                myBoidObject.velocity.add(_steering).normalize();
            } else if (_steering.lengthSq() > 0) {
                _steering.normalize().multiplyScalar(behaviorParams.steeringStrength);
                myBoidObject.velocity.add(_steering).normalize();
            }

            if (myBoidObject.velocity.lengthSq() > 0) {
                boidMesh.quaternion.setFromUnitVectors(_facingUser, myBoidObject.velocity);
            }

            // Wing Flap Rotation
            const children = boidMesh.children;
            for (let i = 0; i < children.length; i++) {
                if (children[i].userData.wing) {
                    children[i].rotation.x = THREE.MathUtils.lerp(children[i].rotation.x, myBoidObject.velocity.y * 0.5, 0.1);
                }
            }

            boidMesh.position.addScaledVector(myBoidObject.velocity, myBoidObject.speed);
            myBoidObject.position.copy(boidMesh.position);
        }

        // Universe Expansion Trigger
        const leaderNearest = boids[0].nearestStarBody;
        if (leaderNearest && leaderNearest !== focusedStarBody && !exploredStarBodies.includes(leaderNearest) && exploredStarBodies.length < 15) {
            exploredStarBodies.push(leaderNearest);
            expandStarBodies(leaderNearest);
        }

        if (cameraParams.cinematicMode) orbitControls.update();
        renderer.render(scene, camera);
        animFrameId = window.requestAnimationFrame(renderloop);
    };

    renderloop();

    // Return Cleanup Callback for React Unmount
    return () => {
        window.cancelAnimationFrame(animFrameId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('resize', handleResize);
        pane.dispose();
        orbitControls.dispose();
        renderer.dispose();
    };
}