import * as THREE from "three";
import { Pane } from "tweakpane";
import { EXRLoader } from "three/examples/jsm/Addons.js";
import { min } from "three/tsl";

interface boid {
    size: number
    color: THREE.Color
    wireframe: boolean
    position: THREE.Vector3
    rotation: THREE.Vector3
    velocity: THREE.Vector3
    speed: number
}

export default function starboids(canvasRef: React.RefObject<HTMLCanvasElement | null>) {

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
    const exrLoader = new EXRLoader();
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
        friendliness: .4,
        friendlyStrength: .55,
        friendlinessRange: 2.5,
        friendlyDot: 0.6,
        windDot: -0.1,
        personalSpaceDot: -0.1,
        personalSpaceMaxDistance: 1.5,
        bound: 5,
        boundPadding: 1.5,
        steeringStrength: .02
    }

    const cameraParams = {
        position: new THREE.Vector3(0, -1, .9),
        rotation: new THREE.Quaternion(.5, 0, 0, 1)
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

    cameraPane.addBinding(
        cameraParams, 'position',
        {
            x: { step: .1 },
            y: { step: .1 },
            z: { step: .1 },
        }
    )
    cameraPane.addBinding(
        cameraParams, 'rotation',
        {
            x: { step: .1 },
            y: { step: .1 },
            z: { step: .1 },
            w: { step: .01 }
        }
    )

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x00ff66, 1)
    scene.add(hemiLight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 3)
    scene.add(sunLight)

    // Add bounding box
    const arenaGeometry = new THREE.BoxGeometry(1, 1, 1, 32, 32, 32)
    const arenaMaterial = new THREE.MeshBasicMaterial({ color: 'green', wireframe: true, side: 2 })
    const arenaMesh = new THREE.Mesh(arenaGeometry, arenaMaterial)
    scene.add(arenaMesh)

    // initialize objects
    const boids: boid[] = [
        {
            size: .1,
            color: new THREE.Color(0xffa800),
            wireframe: false,
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
            velocity: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(),
            speed: .02,
        }
    ]

    // add boids to the scene
    const allBoids = new THREE.Group();
    const createBoidMesh = (b: boid) => {
        const boidGeometry = new THREE.ConeGeometry(.1, .2, 3);
        const boidMaterial = new THREE.MeshStandardMaterial({ color: b.color, wireframe: b.wireframe, side: 2, metalness: .1, roughness: 0 });
        const boidWingMaterial = new THREE.MeshStandardMaterial({ color: 'grey', wireframe: b.wireframe, side: 2, metalness: .3, roughness: 0 });

        const boidMesh = new THREE.Mesh(boidGeometry, boidMaterial);
        const boidMeshWingR = new THREE.Mesh(boidGeometry, boidWingMaterial);
        const boidMeshWingL = new THREE.Mesh(boidGeometry, boidWingMaterial);
        boidMesh.add(boidMeshWingR)
        boidMesh.add(boidMeshWingL)


        boidMeshWingR.scale.y = -1
        boidMeshWingR.scale.x = .5
        boidMeshWingR.scale.z = .25
        boidMeshWingR.position.x = -.1
        boidMeshWingR.position.y = -.175
        boidMeshWingR.position.z = -.025


        boidMeshWingL.scale.y = -1
        boidMeshWingL.scale.x = .5
        boidMeshWingL.scale.z = .25
        boidMeshWingL.position.x = .1
        boidMeshWingL.position.y = -.175
        boidMeshWingL.position.z = -.025

        boidMesh.scale.y = 1.25
        boidMesh.position.copy(b.position)

        allBoids.add(boidMesh)
    }

    boids.forEach((boid) => {
        createBoidMesh(boid)
    })
    // initialize the camera
    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        0.1,
        200
    );
    const cameraBoid = allBoids.children[0]
    // camera.position.add(new THREE.Vector3(0, 0.005, 0.02))
    // cameraBoid.add(camera)
    camera.position.copy(cameraBoid.position)

    scene.add(allBoids);

    // initialize the renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
                position: new THREE.Vector3(Math.random() * behaviorParams.bound * 2 - behaviorParams.bound, Math.random() * behaviorParams.bound * 2 - behaviorParams.bound, Math.random() * behaviorParams.bound * 2 - behaviorParams.bound),
                rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
                velocity: new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50).normalize(),
                speed: .02,
            }
            boids.push(b)
            createBoidMesh(b)
        }
    }

    // render the scene
    const renderloop = () => {
        arenaMesh.scale.setScalar(behaviorParams.bound * 2)

        confirmBoidCount()

        // Position the camera slightly behind and above the leader boid's direction
        const offset = boids[0].velocity.clone().multiplyScalar(-.05).add(new THREE.Vector3(0, -.25, 0));
        const targetCamPos = cameraBoid.position.clone().add(offset);

        // Smoothly interpolate position (dampens jitter)
        camera.position.lerp(targetCamPos, 0.01);

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



        allBoids.children.forEach((boid, index) => {
            const myBoidObject = boids[index]

            // Avoidance Behavior
            const steering = new THREE.Vector3();
            const diff = new THREE.Vector3();
            const forward = myBoidObject.velocity.clone().normalize()

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
                boid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), myBoidObject.velocity.clone().normalize())
            }
            else if (steering.lengthSq() > 0) {
                steering.normalize().multiplyScalar(behaviorParams.steeringStrength);
                myBoidObject.velocity.add(steering).normalize();
                boid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), myBoidObject.velocity.clone().normalize())
            }

            boid.position.addScaledVector(myBoidObject.velocity, myBoidObject.speed)
            myBoidObject.position.copy(boid.position)
        })

        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}