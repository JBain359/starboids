import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from "tweakpane";

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

    // initialize objects
    const boids: boid[] = [
        {
            size: .1,
            color: new THREE.Color(0xffa800),
            wireframe: false,
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
            velocity: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize(),
            speed: .02,
        }
    ]

    for (var i = 0; i < 100; i++) {
        boids.push({
            size: .1,
            color: new THREE.Color('grey'),
            wireframe: true,
            position: new THREE.Vector3(Math.random() * 2, Math.random() * 2, 0),
            rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
            velocity: new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, 0).normalize(),
            speed: .02,
        })
    }

    // add boids to the scene
    const allBoids = new THREE.Group();
    const boidMeshes = boids.forEach((boid) => {

        // create boid
        const boidGeometry = new THREE.CircleGeometry(boid.size, 0);
        const boidMaterial = new THREE.MeshBasicMaterial({ color: boid.color, wireframe: boid.wireframe, side: 2 });
        const boidMesh = new THREE.Mesh(boidGeometry, boidMaterial);
        boidMesh.scale.x = 1.25
        boidMesh.position.copy(boid.position)

        allBoids.add(boidMesh)
    })

    scene.add(allBoids);

    // initialize the camera
    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        0.1,
        200
    );
    camera.position.z = 5;

    // initialize the renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // instantiate the controls
    const controls = new OrbitControls(camera, canvasRef.current!);
    controls.enableDamping = true;

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // initialize clock
    const clock = new THREE.Timer()
    let previousTime = clock.getElapsed();

    // render the scene
    const renderloop = () => {
        const currentTime = clock.getElapsed()
        const timeDelta = currentTime - previousTime
        console.log(timeDelta)

        allBoids.children.forEach((boid, index) => {
            const myBoidObject = boids[index]

            // if (myBoidObject.velocity.length() < 1) myBoidObject.velocity.multiplyScalar(1 + myBoidObject.velocity.length())

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

                const numFriendlys = 40
                const friendlyStrength = 0.75
                const friendlyMaxDistance = 1
                const windDot = -0.1
                const personalSpaceDot = -0.1
                const personalSpaceMaxDistance = 1

                if (dot > 0 && distance < friendlyMaxDistance && Math.abs(index - obi) < numFriendlys) steering.add(diff.clone().normalize().multiplyScalar(friendlyStrength * distance))

                if (distance < personalSpaceMaxDistance && distance > 0) {
                    // check position relative to us using dot product

                    if (dot > personalSpaceDot) { //for two unit vectors a dot product of .5 means the position relative to us is within a 45 degree arc of vision
                        // Calculate force pushing away from the obstacle
                        const pushAway = diff.clone().negate().normalize();

                        // Scale force higher as distance decreases
                        pushAway.multiplyScalar((personalSpaceMaxDistance - distance) / personalSpaceMaxDistance);
                        steering.add(pushAway);
                    }

                    if (dot > windDot) { //for two unit vectors a dot product of -.1 means the position relative to us is within a 220 degree arc of vision
                        // Calculate velocity influence
                        const influence = boids[obi].velocity.clone();

                        // Scale force higher as distance decreases
                        influence.multiplyScalar((personalSpaceMaxDistance - distance) / personalSpaceMaxDistance);
                        influence.multiplyScalar((personalSpaceMaxDistance - distance) / personalSpaceMaxDistance);
                        steering.add(influence);
                    }
                }
            })

            const steeringStrength = .075
            if (steering.lengthSq() > 0) {
                steering.normalize().multiplyScalar(steeringStrength);
                myBoidObject.velocity.add(steering).normalize();
            }

            boid.position.addScaledVector(myBoidObject.velocity, myBoidObject.speed)
            myBoidObject.position.copy(boid.position)
            boid.rotation.z = Math.atan2(myBoidObject.velocity.y * myBoidObject.speed, myBoidObject.velocity.x * myBoidObject.speed)

            // bound the boids
            const bound = 5
            if (Math.abs(boid.position.x) > bound) {
                boid.position.x *= -1
                boid.position.x += -Math.sign(boid.position.x) * .05
            }
            if (Math.abs(boid.position.y) > bound) {
                boid.position.y *= -1
                boid.position.y += -Math.sign(boid.position.y) * .05
            }
            if (Math.abs(boid.position.z) > bound) {
                boid.position.z *= -1
                boid.position.z += -Math.sign(boid.position.z) * .05
            }
        })

        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}