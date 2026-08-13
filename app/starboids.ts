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
    const behviorParams = {
        numBoids: 200,
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
        behviorParams, 'numBoids',
        { min: 0, max: 200, step: 1 }
    )
    behaviorPane.addBinding(
        behviorParams, 'friendliness',
        { min: 0, max: 1, step: .05 }
    )
    behaviorPane.addBinding(
        behviorParams, 'friendlyStrength',
        { min: 0, max: 2, step: .05 }
    )
    behaviorPane.addBinding(
        behviorParams, 'friendlinessRange',
        { min: 0, max: 5, step: .1 }
    )
    behaviorPane.addBinding(
        behviorParams, 'friendlyDot',
        { min: -1, max: 1, step: .1 }
    )
    behaviorPane.addBinding(
        behviorParams, 'windDot',
        { min: -1, max: 1, step: .1 }
    )
    behaviorPane.addBinding(
        behviorParams, 'personalSpaceMaxDistance',
        { min: 0, max: 5, step: .1 }
    )
    behaviorPane.addBinding(
        behviorParams, 'personalSpaceDot',
        { min: -1, max: 1, step: .1 }
    )
    behaviorPane.addBinding(
        behviorParams, 'bound',
        { min: 1, max: 20, step: 1 }
    )
    behaviorPane.addBinding(
        behviorParams, 'boundPadding',
        { min: 0, max: behviorParams.bound, step: .5 }
    )
    behaviorPane.addBinding(
        behviorParams, 'steeringStrength',
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

    // exrLoader.load('./assets/lonely_road_afternoon_puresky_4k.exr', (exr) => {
    //     console.log(exr)
    //     exr.mapping = THREE.EquirectangularReflectionMapping;
    //     scene.environment = exr;
    //     // scene.background = exr
    // })

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
    cameraBoid.add(camera)
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
        const numBoidsWPlayer = behviorParams.numBoids + 1
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
                position: new THREE.Vector3(Math.random() * behviorParams.bound * 2 - behviorParams.bound, Math.random() * behviorParams.bound * 2 - behviorParams.bound, Math.random() * behviorParams.bound * 2 - behviorParams.bound),
                rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
                velocity: new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50).normalize(),
                speed: .02,
            }
            boids.push(b)
            createBoidMesh(b)
        }
    }

    camera.quaternion.set(
        cameraParams.rotation.x,
        cameraParams.rotation.y,
        cameraParams.rotation.z,
        cameraParams.rotation.w
    )

    // render the scene
    const renderloop = () => {
        arenaMesh.scale.setScalar(behviorParams.bound * 2)

        confirmBoidCount()

        camera.position.set(
            cameraParams.position.x,
            cameraParams.position.y,
            cameraParams.position.z
        )

        allBoids.children.forEach((boid, index) => {
            const myBoidObject = boids[index]

            // Avoidance Behavior
            const steering = new THREE.Vector3();
            const diff = new THREE.Vector3();
            const forward = myBoidObject.velocity.clone().normalize()

            allBoids.children.forEach((otherBoid, obi) => {
                if (Math.abs(index - obi) < 1) return; //skip self

                // check distance from self
                diff.subVectors(otherBoid.position, boid.position);
                const distance = diff.length()
                const dot = forward.dot(diff.clone().normalize())

                if (dot > behviorParams.friendlyDot && distance < behviorParams.friendlinessRange && Math.abs(index - obi) < behviorParams.numBoids * behviorParams.friendliness) steering.add(diff.clone().normalize().multiplyScalar(behviorParams.friendlyStrength * distance))

                if (distance < behviorParams.personalSpaceMaxDistance && distance > 0) {
                    // check position relative to us using dot product

                    if (dot > behviorParams.personalSpaceDot) { //for two unit vectors a dot product of .5 means the position relative to us is within a 45 degree arc of vision
                        // Calculate force pushing away from the obstacle
                        const pushAway = diff.clone().negate().normalize();

                        // Scale force higher as distance decreases
                        pushAway.multiplyScalar((behviorParams.personalSpaceMaxDistance - distance) / behviorParams.personalSpaceMaxDistance);
                        steering.add(pushAway);
                    }

                    if (dot > behviorParams.windDot) { //for two unit vectors a dot product of -.1 means the position relative to us is within a 220 degree arc of vision
                        // Calculate velocity influence
                        const influence = boids[obi].velocity.clone();

                        // Scale force higher as distance decreases
                        influence.multiplyScalar((behviorParams.personalSpaceMaxDistance - distance) / behviorParams.personalSpaceMaxDistance);
                        influence.multiplyScalar((behviorParams.personalSpaceMaxDistance - distance) / behviorParams.personalSpaceMaxDistance);
                        steering.add(influence);
                    }
                }
            })

            // avoid boundaries
            if (behviorParams.bound - Math.abs(boid.position.x) < behviorParams.boundPadding) steering.x -= Math.sign(boid.position.x) * (Math.abs(boid.position.x)) * 100
            if (behviorParams.bound - Math.abs(boid.position.y) < behviorParams.boundPadding) steering.y -= Math.sign(boid.position.y) * (Math.abs(boid.position.y)) * 100
            if (behviorParams.bound - Math.abs(boid.position.z) < behviorParams.boundPadding) steering.z -= Math.sign(boid.position.z) * (Math.abs(boid.position.z)) * 100

            if (Math.abs(boid.position.x) > behviorParams.bound) {
                boid.position.x *= -1
                boid.position.x += -Math.sign(boid.position.x) * .05
            }
            if (Math.abs(boid.position.y) > behviorParams.bound) {
                boid.position.y *= -1
                boid.position.y += -Math.sign(boid.position.y) * .05
            }
            if (Math.abs(boid.position.z) > behviorParams.bound) {
                boid.position.z *= -1
                boid.position.z += -Math.sign(boid.position.z) * .05
            }

            // Apply Movement
            if (steering.lengthSq() > 0) {
                steering.normalize().multiplyScalar(behviorParams.steeringStrength);
                myBoidObject.velocity.add(steering).normalize();
                boid.quaternion.rotateTowards(boid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), myBoidObject.velocity.clone().normalize()), .000001);
            }

            boid.position.addScaledVector(myBoidObject.velocity, myBoidObject.speed)
            myBoidObject.position.copy(boid.position)
        })

        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}