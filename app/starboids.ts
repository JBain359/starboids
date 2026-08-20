import * as THREE from "three";
import { Pane } from "tweakpane";
import { HDRLoader, OrbitControls } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { getFresnelMat } from "./getFresnelMat";
import getStarPoints from "./starfield";
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

interface Boid {
    size: number
    color: THREE.Color
    wireframe: boolean
    position: THREE.Vector3
    rotation: THREE.Vector3
    velocity: THREE.Vector3
    speed: number
    nearestStarBody?: StarBody
}

interface StarBody {
    size: number
    color: THREE.Color
    terrainColor: THREE.Color
    seaLevel: number
    emissiveColor: THREE.Color
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

export default async function starboids(canvasRef: React.RefObject<HTMLCanvasElement | null>) {

    const keysPressed: Record<string, boolean> = {};

    window.addEventListener('keydown', (event) => {
        keysPressed[event.code] = true;
    });

    window.addEventListener('keyup', (event) => {
        keysPressed[event.code] = false;
    });

    // initialize the scene
    const scene = new THREE.Scene();
    const pane = new Pane();
    const gltfLoader = new GLTFLoader();
    const cameraPane = pane.addFolder({
        title: 'Camera',
        expanded: false
    })
    const behaviorPane = pane.addFolder({
        title: 'Boid Behavior',
        expanded: false
    });

    // configure options
    const behaviorParams = {
        numBoids: 200,
        friendliness: .35,
        friendlyStrength: 1,
        friendlinessRange: 5,
        friendlyDot: 0.6,
        windDot: -0.1,
        personalSpaceDot: -0.1,
        personalSpaceMaxDistance: 5,
        bound: 10,
        boundPadding: 1.5,
        steeringStrength: .02,
        speed: .05
    }

    const cameraParams = {
        trailing: 0.03,
        offset: new THREE.Vector3(0, -.25, 0),
        cinematicMode: false
    }

    behaviorPane.addBinding(
        behaviorParams, 'numBoids',
        { min: 0, max: 200, step: 1 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'friendliness',
        { min: 0, max: 1, step: .05 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'friendlyStrength',
        { min: 0, max: 2, step: .05 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'friendlinessRange',
        { min: 0, max: 5, step: .1 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'friendlyDot',
        { min: -1, max: 1, step: .1 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'windDot',
        { min: -1, max: 1, step: .1 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'personalSpaceMaxDistance',
        { min: 0, max: 10, step: .1 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'personalSpaceDot',
        { min: -1, max: 1, step: .1 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'bound',
        { min: 1, max: 20, step: 1 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'boundPadding',
        { min: 0, max: behaviorParams.bound, step: .5 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'steeringStrength',
        { min: -1, max: 2, step: .05 }
    )
    behaviorPane.addBinding(
        behaviorParams, 'speed',
        { min: 0, max: 1, step: .05 }
    )

    cameraPane.addBinding(
        cameraParams, 'trailing',
        {
            min: .0005,
            max: 1,
            step: .0005
        }
    )

    cameraPane.addBinding(
        cameraParams, 'offset',
        {
            x: { min: -1, max: 1, step: .05 },
            y: { min: -1, max: 1, step: .05 },
            z: { min: -1, max: 1, step: .05 }
        }
    )

    cameraPane.addBinding(
        cameraParams, 'cinematicMode',
    )

    // add lights
    const hdrLoader = new HDRLoader();

    const hdr = await hdrLoader.loadAsync('./assets/lonely_road_afternoon_puresky_4k.hdr')
    hdr.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = hdr

    // Add bounding box
    const arenaGeometry = new THREE.BoxGeometry(1, 1, 1, 32, 32, 32)
    const arenaMaterial = new THREE.MeshBasicMaterial({ color: 'green', wireframe: true, side: 2 })
    const arenaMesh = new THREE.Mesh(arenaGeometry, arenaMaterial)
    arenaMesh.scale.setScalar(behaviorParams.bound * 2)

    // initialize objects
    const boids: Boid[] = [
        {
            size: .1,
            color: new THREE.Color(0xffa800),
            wireframe: false,
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
            velocity: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(),
            speed: behaviorParams.speed
        }
    ]

    const starBodies: StarBody[] = [
        {
            size: 1,
            color: new THREE.Color(0x46ACC2),
            terrainColor: new THREE.Color(0x2B9720),
            emissiveColor: new THREE.Color(0xffa800),
            seaLevel: .25,
            position: new THREE.Vector3(0, 0, 0),
            lightIntensity: 20,
            lightRange: 40,
            speed: 1,
            stars: {
                numStars: 500,
                starRange: 10
            },
            orbitingBodies: [
                {
                    size: .3,
                    seaLevel: 0,
                    color: new THREE.Color(0xCCB6BD),
                    terrainColor: new THREE.Color(0xBBC7CE),
                    emissiveColor: new THREE.Color(0xffffff),
                    position: new THREE.Vector3(3, 0, 3),
                    lightIntensity: 10,
                    lightRange: 40,
                    speed: .01,
                    orbitingBodies: []
                },
            ]
        }
    ]

    // add boids to the scene
    let boidChassisGeometry: THREE.BufferGeometry;
    let boidChassisMaterial: THREE.Material | null = null;
    let boidWingGeometry: THREE.BufferGeometry;
    let boidWingMaterial: THREE.Material | null = null;

    try {
        // Replace with your actual GLTF file path
        const [chassis, wing] = await Promise.all([
            gltfLoader.loadAsync('./assets/BoidCraft_Chassis.gltf'),
            gltfLoader.loadAsync('./assets/BoidCraft_Wing.gltf')
        ])

        // Find the first mesh inside the GLTF hierarchy
        let loadedChassisMesh: THREE.Mesh | null = null;
        chassis.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !loadedChassisMesh) {
                loadedChassisMesh = child as THREE.Mesh;
            }
        });

        if (loadedChassisMesh) {
            // Clone geometry so modifications won't mutate cached assets
            boidChassisGeometry = (loadedChassisMesh as THREE.Mesh).geometry.clone();

            // Optional: Standardize geometry center and orientation
            boidChassisGeometry.center();

            // Use model's original material or keep your custom materials
            boidChassisMaterial = (loadedChassisMesh as THREE.Mesh).material as THREE.Material<THREE.MaterialEventMap>;
        } else {
            boidChassisGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
        }
        let loadedWingMesh: THREE.Mesh | null = null
        wing.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !loadedWingMesh) {
                loadedWingMesh = child as THREE.Mesh
            }
        })
        if (loadedWingMesh) {
            boidWingGeometry = (loadedWingMesh as THREE.Mesh).geometry.clone();

            boidWingGeometry.center();

            boidWingMaterial = (loadedWingMesh as THREE.Mesh).material as THREE.Material<THREE.MaterialEventMap>;
        } else {
            boidWingGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
        }
    } catch (err) {
        console.warn("Failed to load GLTF model, falling back to ConeGeometry", err);
        boidChassisGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
    }

    const allBoids = new THREE.Group();
    const createBoidMesh = (b: Boid) => {
        // Standard default material if model material isn't used
        const boidMaterial = new THREE.MeshStandardMaterial({
            color: b.color,
            wireframe: b.wireframe,
            metalness: .6,
            roughness: 0,
            side: 2
        });

        const boidMesh = new THREE.Mesh(boidChassisGeometry, boidMaterial);
        const boidWingL = new THREE.Mesh(boidWingGeometry, boidMaterial);
        boidWingL.position.x = -2
        boidWingL.position.y = .25
        boidWingL.position.z = 0

        const boidWingR = new THREE.Mesh(boidWingGeometry, boidMaterial);
        boidWingR.position.x = 2
        boidWingR.position.y = .25
        boidWingR.position.z = 0
        boidWingR.scale.set(-1, 1, 1)

        boidMesh.add(boidWingR)
        boidMesh.add(boidWingL)
        // Adjust scale according to imported model dimensions
        boidMesh.scale.setScalar(b.size);
        boidMesh.position.copy(b.position);

        allBoids.add(boidMesh);
    }

    boids.forEach((boid) => {
        createBoidMesh(boid)
    })

    const allStarBodies = new THREE.Group();
    const createStarBody = (body: StarBody, group: THREE.Object3D) => {
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: body.color, emissive: body.color, emissiveIntensity: body.lightIntensity / 100, metalness: .1, roughness: 1, flatShading: true });
        const bodyGeometry = new THREE.IcosahedronGeometry(body.size, 1)
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
        bodyMesh.userData.orbitable = true;

        const terrainMaterial = new THREE.MeshStandardMaterial({
            color: body.terrainColor, emissive: body.terrainColor, emissiveIntensity: body.lightIntensity / 100, metalness: .6, roughness: .5
        });

        const terrainGeometry = new THREE.IcosahedronGeometry(body.size, 3)

        // 2. Prepare Perlin Noise generator
        const perlin = new ImprovedNoise();
        const positionAttribute = terrainGeometry.attributes.position;
        const vertex = new THREE.Vector3();

        const noiseScale = 10;  // Frequency of bumps
        const heightFactor = .25 * body.size // Amplitude of terrain peaks

        // 3. Displace each vertex along its normal
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

        // 4. Recalculate normals for correct lighting
        terrainGeometry.computeVertexNormals();
        const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial)

        const atmosphereHeight = body.size * (1 + 0.5 * Math.random())
        const atmoMaterial = getFresnelMat({ facingHex: 0x000000, rimHex: body.color.getHex() });
        const atmoGeometry = new THREE.IcosahedronGeometry(body.size + heightFactor, 1);
        const atmoMesh = new THREE.Mesh(atmoGeometry, atmoMaterial)
        bodyMesh.userData.atmosphere = true;

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
            createStarBody(orb, bodyMesh)
        })
        group.add(bodyMesh)
    }
    starBodies.forEach((body) => {
        createStarBody(body, allStarBodies)
    })

    // initialize the camera
    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        0.01,
        200
    );
    const cameraBoid = allBoids.children[0]
    camera.position.copy(cameraBoid.position)

    scene.add(allBoids)
    scene.add(allStarBodies)


    // initialize the renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.enableDamping = true;

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const confirmBoidCount = () => {
        const numBoidsWPlayer = behaviorParams.numBoids + 1
        while (numBoidsWPlayer < boids.length) {
            boids.pop()
            const b = allBoids.children.pop() as THREE.Mesh
            if (!b) return;
            b.geometry.dispose();
            (b.material as THREE.Material).dispose()
        }

        while (numBoidsWPlayer > allBoids.children.length) {
            const b = {
                size: .1,
                color: new THREE.Color('white'),
                wireframe: false,
                position: new THREE.Vector3(Math.random() * behaviorParams.bound * 2 - behaviorParams.bound, Math.random() * behaviorParams.bound * 2 - behaviorParams.bound, Math.random() * behaviorParams.bound * 2 - behaviorParams.bound).add(cameraBoid.position),
                rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
                velocity: new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50).normalize(),
                speed: behaviorParams.speed,
            }
            boids.push(b)
            createBoidMesh(b)
        }
    }

    const generateRandomStarBody = (position: THREE.Vector3, size: number, moons: number = 0): StarBody => {
        const bodySize = Math.random() * size / 2
        const color = new THREE.Color(
            Math.random(),
            Math.random(),
            Math.random()
        )
        const terrainColor = new THREE.Color(
            Math.random(),
            Math.random(),
            Math.random()
        )
        const lightIntensity = Math.random() * 100
        const lightRange = Math.random() * 100

        return {
            size: bodySize,
            color: color,
            terrainColor: terrainColor,
            emissiveColor: color,
            seaLevel: Math.random(),
            position: position,
            lightIntensity: lightIntensity,
            lightRange: lightRange,
            speed: Math.random() * .01 - .02,
            stars: moons > 0 ? { numStars: 500, starRange: 10 } : { numStars: 0, starRange: 0 },
            orbitingBodies: Array.from(
                { length: moons },
                () => generateRandomStarBody(
                    new THREE.Vector3(
                        Math.random(),
                        Math.random(),
                        Math.random()
                    ).multiplyScalar(bodySize).addScalar(Math.random() * 5),
                    bodySize
                )
            )
        }
    }

    const expandStarBodies = (star: StarBody) => {
        // generate three random vectors of a certain length
        const numNewStars = 2 * Math.random()
        const pos = []
        for (let i = 0; i < numNewStars; i++) {
            const newStarDistance = (5 * Math.random() - 5) + behaviorParams.bound * 2
            pos.push(
                new THREE.Vector3(
                    2 * Math.random() - 1,
                    2 * Math.random() - 1,
                    2 * Math.random() - 1
                )
                    .normalize()
                    .multiplyScalar(newStarDistance)
                    .add(star.position)
            )
        }

        // create random starbodies there
        pos.forEach((p) => {
            const newStarBody = generateRandomStarBody(p, 3, 3 * Math.random())
            starBodies.push(newStarBody)

            createStarBody(newStarBody, allStarBodies)
        })
    }

    // render the scene

    //initialize some repeated vectors
    const orbitAxis = new THREE.Vector3()
    const steering = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const facingUser = new THREE.Vector3(0, 0, 1)
    const zeroVector = new THREE.Vector3();
    const exploredStarBodies: StarBody[] = []
    const renderloop = () => {
        confirmBoidCount()

        // Position the camera slightly behind and above the leader boid's direction
        const offset = boids[0].velocity.clone().multiplyScalar(-.05).add(cameraParams.offset);
        const targetCamPos = cameraBoid.position.clone().add(offset);

        // Smoothly interpolate position (dampens jitter)
        camera.position.lerp(targetCamPos, cameraParams.trailing);

        // Smoothly look at the target position ahead of the boid
        const lookTarget = cameraBoid.position.clone().add(boids[0].velocity.clone().multiplyScalar(.5));
        camera.lookAt(lookTarget);
        const cameraLookTarget = camera.worldToLocal(lookTarget.clone())

        if (keysPressed['ArrowUp']) {
            cameraLookTarget.y += 1
        }
        if (keysPressed['ArrowDown']) {
            cameraLookTarget.y -= 1
        }
        if (keysPressed['ArrowLeft']) {
            cameraLookTarget.x -= 1
        }
        if (keysPressed['ArrowRight']) {
            cameraLookTarget.x += 1
        }

        // Rotate orbiting bodies about starbodies
        allStarBodies.children.forEach((body, index) => {
            const myStarBodyObject = starBodies[index]
            body.children[0].rotation.y += .01

            body.children.filter((c) => (c as THREE.Mesh).userData.orbitable).forEach((child, ci) => {
                const childVector = myStarBodyObject.orbitingBodies[ci].position.clone()

                //calculate the rotation axis using the cross product
                orbitAxis.crossVectors(childVector, new THREE.Vector3(0, 0, 1)).normalize()

                // Move mesh about its orbit
                child.position.applyAxisAngle(orbitAxis, myStarBodyObject.orbitingBodies[ci].speed)
            })
        })

        let focusedStarBody = boids[0].nearestStarBody

        allBoids.children.forEach((boid, index) => {
            const myBoidObject = boids[index]

            // Avoidance Behavior
            steering.set(0, 0, 0)
            diff.set(0, 0, 0)
            forward.copy(myBoidObject.velocity.clone().normalize())

            let starDistance = 999999;
            allStarBodies.children.forEach((body, sbi) => {
                const myStarBodyObject = starBodies[sbi]
                diff.subVectors(body.position, boid.position);
                const distance = diff.length()

                if (distance < starDistance) {
                    starDistance = distance
                    myBoidObject.nearestStarBody = myStarBodyObject
                }

                if (distance < myStarBodyObject.size * 5) {
                    const pushAway = diff.clone().negate().normalize()

                    pushAway.multiplyScalar((myStarBodyObject.size * 5 - distance) / myStarBodyObject.size * 1.5);
                    steering.add(pushAway);
                }
            })

            allBoids.children.forEach((otherBoid, obi) => {
                if (Math.abs(index - obi) < 1) return; //skip self
                // if (obi == 0) return; //dont be influenced by player

                // check distance from self
                diff.subVectors(otherBoid.position.clone().add(boids[obi].velocity), boid.position);
                const distance = diff.length()
                const dot = forward.dot(diff.clone().normalize())

                if (dot > behaviorParams.friendlyDot && distance < behaviorParams.friendlinessRange && Math.abs(index - obi) < behaviorParams.numBoids * behaviorParams.friendliness) steering.add(diff.clone().normalize().multiplyScalar(behaviorParams.friendlyStrength * distance))

                if (distance < behaviorParams.personalSpaceMaxDistance && distance > 0) {
                    // check position relative to us using dot product

                    if (dot > behaviorParams.personalSpaceDot) { //for two unit vectors a dot product of .5 means the position relative to us is within a 45 degree arc of vision
                        // Calculate force pushing away from the obstacle
                        const pushAway = diff.clone().negate().normalize();

                        // Scale force higher as distance decreases
                        pushAway.multiplyScalar((behaviorParams.personalSpaceMaxDistance - distance) / behaviorParams.personalSpaceMaxDistance);
                        pushAway.multiplyScalar((behaviorParams.personalSpaceMaxDistance - distance) / behaviorParams.personalSpaceMaxDistance);
                        steering.add(pushAway);
                    }

                    if (dot > behaviorParams.windDot) { //for two unit vectors a dot product of -.1 means the position relative to us is within a 220 degree arc of vision
                        // Calculate velocity influence
                        const influence = boids[obi].velocity.clone();

                        // Scale force higher as distance decreases
                        influence.multiplyScalar((behaviorParams.personalSpaceMaxDistance - distance) / behaviorParams.personalSpaceMaxDistance);
                        influence.multiplyScalar((behaviorParams.personalSpaceMaxDistance - distance) / behaviorParams.personalSpaceMaxDistance);
                        steering.add(influence);
                    }
                }
            })

            // avoid boundaries
            if (behaviorParams.bound - Math.abs((myBoidObject.nearestStarBody?.position ?? zeroVector).x - boid.position.x) < behaviorParams.boundPadding) steering.x -= Math.sign(boid.position.x) * (Math.abs(boid.position.x)) * 50
            if (behaviorParams.bound - Math.abs((myBoidObject.nearestStarBody?.position ?? zeroVector).y - boid.position.y) < behaviorParams.boundPadding) steering.y -= Math.sign(boid.position.y) * (Math.abs(boid.position.y)) * 50
            if (behaviorParams.bound - Math.abs((myBoidObject.nearestStarBody?.position ?? zeroVector).z - boid.position.z) < behaviorParams.boundPadding) steering.z -= Math.sign(boid.position.z) * (Math.abs(boid.position.z)) * 50

            // Apply Movement
            if ((keysPressed['ArrowUp'] || keysPressed['ArrowDown'] || keysPressed['ArrowLeft'] || keysPressed['ArrowRight']) && index == 0) {
                const playerTarget = camera.localToWorld(cameraLookTarget.clone())
                steering.subVectors(playerTarget, lookTarget)
                steering.normalize().multiplyScalar(behaviorParams.steeringStrength)
                myBoidObject.velocity.add(steering).normalize();

            }
            else if (steering.lengthSq() > 0) {
                steering.normalize().multiplyScalar(behaviorParams.steeringStrength);
                myBoidObject.velocity.add(steering).normalize();
            }

            if (myBoidObject.velocity.lengthSq() > 0) {
                boid.quaternion.setFromUnitVectors(facingUser, myBoidObject.velocity);
            }

            boid.children.forEach((wing) => {
                wing.rotation.x = THREE.MathUtils.lerp(wing.rotation.x, myBoidObject.velocity.y * .5, .1)
            })
            boid.position.addScaledVector(myBoidObject.velocity, behaviorParams.speed)
            myBoidObject.position.copy(boid.position)
        })

        // if the focused StarBody has changed and is new, expand the universe
        if (boids[0].nearestStarBody && boids[0].nearestStarBody != focusedStarBody && exploredStarBodies.indexOf(boids[0].nearestStarBody) < 0 && exploredStarBodies.length < 15) {
            exploredStarBodies.push(boids[0].nearestStarBody)
            focusedStarBody = boids[0].nearestStarBody

            expandStarBodies(boids[0].nearestStarBody)
        }

        if (cameraParams.cinematicMode)
            orbitControls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}