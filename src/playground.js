var createScene = function () {
    const scene = new BABYLON.Scene(engine)
    scene.enablePhysics(new BABYLON.Vector3(0, -4, 0), new BABYLON.AmmoJSPlugin(false, ammo))

    const camera = new BABYLON.ArcRotateCamera(`camera`, -Math.PI / 2, Math.PI / 2, 50, BABYLON.Vector3.ZeroReadOnly)
    camera.attachControl(null, true)

    const light = new BABYLON.HemisphericLight(`light`, new BABYLON.Vector3(0, 1, 0), scene)
    light.intensity = 0.7

    const plane1 = BABYLON.MeshBuilder.CreatePlane(`plane 1`, { size: 8, sideOrientation: BABYLON.Mesh.DOUBLESIDE })
    plane1.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightReadOnly, Math.PI / 2)
    plane1.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightHandedForwardReadOnly, Math.PI / 8)
    plane1.scaling.y = 0.25
    plane1.position.set(-7, 0, 0)
    plane1.physicsImpostor =  new BABYLON.PhysicsImpostor(plane1, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 1 }, scene)

    const plane2 = plane1.clone(`plane 2`)
    plane2.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightHandedForwardReadOnly, -Math.PI / 3)
    plane2.scaling.x = 2
    plane2.position.set(7, 0, 0)
    plane2.physicsImpostor =  new BABYLON.PhysicsImpostor(plane2, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 1 }, scene)

    const onCollide = (collider, collidedAgainst, point) => {
        const sphere = collider.object
        const now = Date.now()
        if (200 < now - sphere.lastCollisionTime) {
            // console.debug(`plane frequency factor = ${1 / collidedAgainst.object.scaling.x}`)
            const frequencyFactor = collidedAgainst.object.scaling.x
            sphere.lastCollisionTime = now
        }
    }

    setInterval(() => {
        let sphere = BABYLON.MeshBuilder.CreateSphere(`sphere`, { diameter: 0.5, segments: 32 }, scene)
        sphere.position.set(-10, 12, 0)
        sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 1 }, scene)
        sphere.physicsImpostor.executeNativeFunction((world, physicsBody) => {
            world.removeCollisionObject(physicsBody)
            world.addRigidBody(physicsBody, 1, 2)
        })
        sphere.physicsImpostor.registerOnPhysicsCollide(plane1.physicsImpostor, onCollide)
        sphere.physicsImpostor.registerOnPhysicsCollide(plane2.physicsImpostor, onCollide)
        sphere.lastCollisionTime = 0
    }, 500)

    return scene
}

function isInBabylonPlayground() {
    return document.getElementById('pg-root') !== null
}

if (!isInBabylonPlayground()) {
    module.exports = createScene
}
