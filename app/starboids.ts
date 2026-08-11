import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from "tweakpane";

export default function starboids(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    // initialize the scene
    const scene = new THREE.Scene();

    // add objects to the scene
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: "red", wireframe: true });
    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);

    scene.add(cubeMesh);

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
    // controls.autoRotate = true;

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

        previousTime = currentTime

        cubeMesh.rotation.y += THREE.MathUtils.degToRad(1) * timeDelta * 20
        cubeMesh.rotation.z += THREE.MathUtils.degToRad(1) * timeDelta * 200
        cubeMesh.scale.setScalar(Math.sin(currentTime * 2) * .25 + 1.25)
        cubeMesh.rotateX(THREE.MathUtils.degToRad(Math.sin(currentTime * Math.random() * 2) * .25 + 1.25))


        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(renderloop);
    };

    renderloop();
}