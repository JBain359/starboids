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
            velocity: new THREE.Vector3(Math.random(), Math.random(), 0),
            speed: .01
        }
    ]

    for (var i = 0; i < 20; i++) {
        boids.push({
            size: .1,
            color: new THREE.Color('grey'),
            wireframe: true,
            position: new THREE.Vector3(Math.random() * 2, Math.random() * 2, 0),
            rotation: new THREE.Vector3(THREE.MathUtils.degToRad(90), 0, 0),
            velocity: new THREE.Vector3(Math.random(), Math.random(), 0),
            speed: (Math.random() * 2 - 1) * .01
        })
    }

    // add boids to the scene
    const allBoids = new THREE.Group();
    const boidMeshes = boids.forEach((boid) => {

        const boidGeometry = new THREE.CircleGeometry(boid.size, 0);
        const boidMaterial = new THREE.MeshBasicMaterial({ color: boid.color, wireframe: boid.wireframe });
        const boidMesh = new THREE.Mesh(boidGeometry, boidMaterial);
        boidMesh.scale.x = 1.25
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
            boid.position.addScaledVector(myBoidObject.velocity, myBoidObject.speed)
            boid.rotation.z = Math.atan2(myBoidObject.velocity.y * myBoidObject.speed, myBoidObject.velocity.x * myBoidObject.speed)

            // bound the boids
            if (boid.position.x > 2) {
                boid.position.x = -2
            }
            if (boid.position.y > 2) {
                boid.position.y = -2
            }
            if (boid.position.z > 2) {
                boid.position.z = -2
            }
        })

        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}