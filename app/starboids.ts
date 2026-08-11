import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from "tweakpane";
import ThreeScene from "./ThreeScene";
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

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

    const behviorParams = {
        numBoids: 100,
        friendliness: .4,
        friendlyStrength: 0.75,
        friendlinessRange: 1,
        friendlyDot: 0,
        windDot: -0.1,
        personalSpaceDot: -0.1,
        personalSpaceMaxDistance: 1,
        bound: 5,
        boundPadding: 1.5,
        steeringStrength: .075
    }

    pane.addBinding(
        behviorParams, 'numBoids',
        { min: 0, max: 200, step: 1 }
    )
    pane.addBinding(
        behviorParams, 'friendliness',
        { min: 0, max: 1, step: .05 }
    )
    pane.addBinding(
        behviorParams, 'friendlyStrength',
        { min: 0, max: 2, step: .05 }
    )
    pane.addBinding(
        behviorParams, 'friendlinessRange',
        { min: 0, max: 5, step: .1 }
    )
    pane.addBinding(
        behviorParams, 'friendlyDot',
        { min: -1, max: 1, step: .1 }
    )
    pane.addBinding(
        behviorParams, 'windDot',
        { min: -1, max: 1, step: .1 }
    )
    pane.addBinding(
        behviorParams, 'personalSpaceMaxDistance',
        { min: 0, max: 5, step: .1 }
    )
    pane.addBinding(
        behviorParams, 'personalSpaceDot',
        { min: -1, max: 1, step: .1 }
    )
    pane.addBinding(
        behviorParams, 'bound',
        { min: 1, max: 20, step: 1 }
    )
    pane.addBinding(
        behviorParams, 'boundPadding',
        { min: 0, max: behviorParams.bound, step: .5 }
    )
    pane.addBinding(
        behviorParams, 'steeringStrength',
        { min: -1, max: 2, step: .05 }
    )

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
        const boidMaterial = new THREE.MeshBasicMaterial({ color: b.color, wireframe: b.wireframe, side: 2 });
        const boidMesh = new THREE.Mesh(boidGeometry, boidMaterial);
        boidMesh.scale.y = 1.25
        boidMesh.position.copy(b.position)

        allBoids.add(boidMesh)
    }

    boids.forEach((boid) => {
        createBoidMesh(boid)
    })
    scene.add(allBoids);

    // initialize the camera
    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        0.1,
        200
    );
    camera.position.z = 10;

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
            // console.log(`adding boid at ${i}`)
            const b = {
                size: .1,
                color: new THREE.Color('grey'),
                wireframe: true,
                position: new THREE.Vector3(Math.random() * behviorParams.bound, Math.random() * behviorParams.bound, Math.random() * behviorParams.bound),
                rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
                velocity: new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50).normalize(),
                speed: .02,
            }
            boids.push(b)
            createBoidMesh(b)
        }
        console.log(`I have ${boids.length} boids now`)
        console.log(`There are ${allBoids.children.length} boids in the group`)
    }

    // render the scene
    const renderloop = () => {

        confirmBoidCount()

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
            if (behviorParams.bound - Math.abs(boid.position.x) < behviorParams.boundPadding) steering.x -= Math.sign(boid.position.x) * (behviorParams.bound - Math.abs(boid.position.x)) * 200
            if (behviorParams.bound - Math.abs(boid.position.y) < behviorParams.boundPadding) steering.y -= Math.sign(boid.position.y) * (behviorParams.bound - Math.abs(boid.position.y)) * 200
            if (behviorParams.bound - Math.abs(boid.position.z) < behviorParams.boundPadding) steering.z -= Math.sign(boid.position.z) * (behviorParams.bound - Math.abs(boid.position.z)) * 200

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
            }

            boid.position.addScaledVector(myBoidObject.velocity, myBoidObject.speed)
            myBoidObject.position.copy(boid.position)
            boid.rotation.z = Math.atan2(myBoidObject.velocity.y * myBoidObject.speed, myBoidObject.velocity.x * myBoidObject.speed)
            boid.rotateZ(THREE.MathUtils.degToRad(-90))
        })


        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}