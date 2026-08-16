import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export default function Viewer3d(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(w, h);
    document.body.appendChild(renderer.domElement);

    const gltfLoader = new GLTFLoader();

    let object = new THREE.Object3D()
    const crocotileTest = gltfLoader.load('./assets/BoidCraft.gltf', (gltf) => {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.position.multiplyScalar(0);
                child.material.metalness = .7
                child.material.roughness = 0
                object = child;
                console.log(child)
                scene.add(object)
            }
        })
    })

    const ctrls = new OrbitControls(camera, renderer.domElement);
    ctrls.enableDamping = true;

    // const geometry = new THREE.BoxGeometry();
    // const material = new THREE.MeshStandardMaterial({
    //     color: 0xffff00,
    // });
    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    scene.add(hemiLight);

    const ambiLight = new THREE.AmbientLight(0xffffff, .1);
    scene.add(ambiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3)
    scene.add(sunLight)


    function animate() {
        requestAnimationFrame(animate);
        // object.rotation.x += 0.01;
        // object.rotation.y += 0.02;
        renderer.render(scene, camera);
        ctrls.update();
    }

    animate();

    function handleWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', handleWindowResize, false);
}
