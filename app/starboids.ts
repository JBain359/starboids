import * as THREE from "three";
import { Pane } from "tweakpane";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

interface Boid {
    size: number
    color: THREE.Color
    wireframe: boolean
    position: THREE.Vector3
    rotation: THREE.Vector3
    velocity: THREE.Vector3
    speed: number
}

interface StarBody {
    size: number
    color: THREE.Color
    emissiveColor: THREE.Color
    position: THREE.Vector3
    lightIntensity: number
    lightRange: number
    speed: number
    orbitingBodies: StarBody[]
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
        numBoids: 100,
        friendliness: .2,
        friendlyStrength: .55,
        friendlinessRange: 2.5,
        friendlyDot: 0.6,
        windDot: -0.1,
        personalSpaceDot: -0.1,
        personalSpaceMaxDistance: 1.5,
        bound: 5,
        boundPadding: 1.5,
        steeringStrength: .02,
        speed: .05
    }

    const cameraParams = {
        trailing: 0.024,
        offset: new THREE.Vector3(0, -.25, 0)
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
        { min: 0, max: 5, step: .1 }
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

    // add lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffa800, 1)
    scene.add(hemiLight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 3)
    scene.add(sunLight)

    // Add bounding box
    const arenaGeometry = new THREE.BoxGeometry(1, 1, 1, 32, 32, 32)
    const arenaMaterial = new THREE.MeshBasicMaterial({ color: 'green', wireframe: true, side: 2 })
    const arenaMesh = new THREE.Mesh(arenaGeometry, arenaMaterial)
    // scene.add(arenaMesh)

    // initialize objects
    const boids: Boid[] = [
        {
            size: .1,
            color: new THREE.Color(0xffa800),
            wireframe: false,
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
            velocity: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(),
            speed: behaviorParams.speed,
        }
    ]

    const starBodies: StarBody[] = [
        {
            size: 1,
            color: new THREE.Color(0xffa800),
            emissiveColor: new THREE.Color(0xffa800),
            position: new THREE.Vector3(0, 0, 0),
            lightIntensity: 100,
            lightRange: 40,
            orbitingBodies: [
                {
                    size: .3,
                    color: new THREE.Color(0xffffff),
                    emissiveColor: new THREE.Color(0xffffff),
                    position: new THREE.Vector3(1, 1, 1),
                    lightIntensity: 100,
                    lightRange: 40,
                    speed: .01,
                    orbitingBodies: []
                },
                {
                    size: .5,
                    color: new THREE.Color(0xff00ff),
                    emissiveColor: new THREE.Color(0xff00ff),
                    position: new THREE.Vector3(1, 3, 1),
                    lightIntensity: 100,
                    lightRange: 40,
                    speed: .04,
                    orbitingBodies: []
                }
            ]
        }
    ]

    // add boids to the scene
    let boidChassisGeometry: THREE.BufferGeometry;
    let boidChassisMaterial: THREE.Material | null = null;
    let boidWingGeometry: THREE.BufferGeometry;

    try {
        // Replace with your actual GLTF file path
        const chassis = await gltfLoader.loadAsync('./assets/BoidCraft_Chassis.gltf');

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

        const wing = await gltfLoader.loadAsync('./assets/BoidCraft_Wing.gltf')
        let loadedWingMesh: THREE.Mesh | null = null
        wing.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !loadedWingMesh) {
                loadedWingMesh = child as THREE.Mesh
            }
        })
        if (loadedWingMesh) {
            boidWingGeometry = (loadedWingMesh as THREE.Mesh).geometry.clone();

            boidWingGeometry.center();
        } else {
            boidChassisGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
        }
    } catch (err) {
        console.warn("Failed to load GLTF model, falling back to ConeGeometry", err);
        boidChassisGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
    }

    const allBoids = new THREE.Group();
    const createBoidMesh = (b: Boid) => {
        // Standard default material if model material isn't used
        const boidMaterial = boidChassisMaterial ?? new THREE.MeshStandardMaterial({
            color: b.color,
            wireframe: b.wireframe,
            metalness: 1,
            roughness: 0
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
        boidWingR.scale.x = -1

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
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: body.color, emissive: body.color, emissiveIntensity: 1000 });
        const bodyGeometry = new THREE.SphereGeometry(body.size, 8, 8);
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
        bodyMesh.position.copy(body.position)

        const starLight = new THREE.PointLight(body.emissiveColor, body.lightIntensity, body.lightRange)
        starLight.position.copy(body.position)

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
    // arenaMesh.scale.setScalar(behaviorParams.bound * 2)
    // allBoids.scale.setScalar(1 / (behaviorParams.bound * 2))
    // allStarBodies.scale.setScalar(1 / (behaviorParams.bound * 2))


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
                color: new THREE.Color('blue'),
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

    // render the scene

    //initialize some repeated vectors
    const orbitAxis = new THREE.Vector3()
    const steering = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const facingUser = new THREE.Vector3(0, 0, 1)
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

            body.children.filter((c) => (c as THREE.Mesh).isMesh).forEach((child, ci) => {
                const childVector = myStarBodyObject.orbitingBodies[ci].position.clone()

                //calculate the rotation axis using the cross product
                orbitAxis.crossVectors(childVector, new THREE.Vector3(0, 0, 1)).normalize()

                // Move mesh about its orbit
                child.position.applyAxisAngle(orbitAxis, myStarBodyObject.orbitingBodies[ci].speed)
            })
        })

        allBoids.children.forEach((boid, index) => {
            const myBoidObject = boids[index]

            // Avoidance Behavior
            steering.set(0, 0, 0)
            diff.set(0, 0, 0)
            forward.copy(myBoidObject.velocity.clone().normalize())

            allStarBodies.children.forEach((body, sbi) => {
                const myStarBodyObject = starBodies[sbi]
                diff.subVectors(body.position, boid.position);
                const distance = diff.length()
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
                diff.subVectors(otherBoid.position, boid.position);
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
            if (behaviorParams.bound - Math.abs(boid.position.x) < behaviorParams.boundPadding) steering.x -= Math.sign(boid.position.x) * (Math.abs(boid.position.x)) * 100
            if (behaviorParams.bound - Math.abs(boid.position.y) < behaviorParams.boundPadding) steering.y -= Math.sign(boid.position.y) * (Math.abs(boid.position.y)) * 100
            if (behaviorParams.bound - Math.abs(boid.position.z) < behaviorParams.boundPadding) steering.z -= Math.sign(boid.position.z) * (Math.abs(boid.position.z)) * 100

            // Apply Movement
            if ((keysPressed['ArrowUp'] || keysPressed['ArrowDown'] || keysPressed['ArrowLeft'] || keysPressed['ArrowRight']) && index == 0) {
                const playerTarget = camera.localToWorld(cameraLookTarget.clone())
                steering.subVectors(playerTarget, lookTarget)
                steering.normalize().multiplyScalar(behaviorParams.steeringStrength)
                myBoidObject.velocity.add(steering).normalize();

                boid.quaternion.setFromUnitVectors(facingUser, myBoidObject.velocity.clone().normalize())
            }
            else if (steering.lengthSq() > 0) {
                steering.normalize().multiplyScalar(behaviorParams.steeringStrength);
                myBoidObject.velocity.add(steering).normalize();

                boid.quaternion.setFromUnitVectors(facingUser, myBoidObject.velocity.clone().normalize())
            }

            boid.children.forEach((wing) => {
                wing.rotation.x = THREE.MathUtils.lerp(wing.rotation.x, myBoidObject.velocity.y * .5, .1)
            })
            boid.position.addScaledVector(myBoidObject.velocity, behaviorParams.speed)
            myBoidObject.position.copy(boid.position)
        })

        // orbitControls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}