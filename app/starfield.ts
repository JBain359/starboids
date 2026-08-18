import * as THREE from 'three'

export default function getStarPoints({ numStars = 500, r = 2 } = {}) {
    function randomSpherePoint() {
        const radius = Math.random() * r + r
        const u = Math.random()
        const v = Math.random()

        const theta = 2 * Math.PI * u
        const phi = Math.acos(2 * v - 1)

        let x = radius * Math.sin(phi) * Math.cos(theta)
        let y = radius * Math.sin(phi) * Math.sin(theta)
        let z = radius * Math.cos(phi)


        return {
            pos: new THREE.Vector3(x, y, z),
            hue: .6,
            minDist: radius
        }
    }

    const verts = []
    const colors = []
    const positions = []
    let col;

    for (let i = 0; i < numStars; i++) {
        let p = randomSpherePoint()
        const { pos, hue } = p
        positions.push(p)

        col = new THREE.Color().setHSL(hue, .2, Math.random())
        verts.push(pos.x, pos.y, pos.z)
        colors.push(col.r, col.g, col.b)
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3))
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        map: new THREE.TextureLoader().load(
            './assets/circle.png'
        ),
        transparent: true
    })
    const points = new THREE.Points(geometry, material)
    return points
}