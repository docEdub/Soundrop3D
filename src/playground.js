var createScene = function () {
    const scene = new BABYLON.Scene(engine)
    scene.enablePhysics(new BABYLON.Vector3(0, -4, 0), new BABYLON.CannonJSPlugin(false, 20, CANNON))
    const physicsEngine = scene.getPhysicsEngine();
    physicsEngine.setSubTimeStep(10);

    var camera = new BABYLON.FreeCamera(`camera`, new BABYLON.Vector3(0, 5, -20), scene)
    camera.setTarget(BABYLON.Vector3.Zero())
    camera.attachControl(null, true)

    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene)
    light.intensity = 0.7


    const sphereCount = 10
    // const spheres = []
    // for (let i = 0; i < sphereCount; i++) {
    //     let sphere = BABYLON.MeshBuilder.CreateSphere(`sphere`, { diameter: 1, segments: 32 }, scene)
    //     sphere.position.set(-10, 12, 0)
    //     sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.95,  }, scene)
    //     sphereImposters.push(sphere.physicsImpostor)
    // }

    const plane1 = BABYLON.MeshBuilder.CreatePlane(`plane 1`, { size: 8, sideOrientation: BABYLON.Mesh.DOUBLESIDE })
    plane1.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightReadOnly, Math.PI / 2)
    plane1.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightHandedForwardReadOnly, Math.PI / 8)
    // plane1.scaling.y = 0.25
    plane1.position.set(-7, 0, 0)
    plane1.physicsImpostor =  new BABYLON.PhysicsImpostor(plane1, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 1 }, scene)
    plane1.physicsImpostor.physicsBody.collisionFilterGroup = 2

    const plane2 = plane1.clone()
    plane2.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightHandedForwardReadOnly, -Math.PI / 3)
    // plane2.scaling.x = 2
    plane2.position.set(7, 0, 0)
    plane2.physicsImpostor =  new BABYLON.PhysicsImpostor(plane2, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 1 }, scene)
    plane2.physicsImpostor.physicsBody.collisionFilterGroup = 2

    // plane1.physicsImpostor.registerOnPhysicsCollide(sphereImposters, (collider, collidedAgainst, point) => {
    //     console.debug(`Sphere collided with plane 1`)
    // })

    // plane2.physicsImpostor.registerOnPhysicsCollide(sphereImposters, (collider, collidedAgainst, point) => {
    //     console.debug(`Sphere collided with plane 2`)
    // })

    const onCollide = (collider, collidedAgainst, point) => {
        console.debug(`onCollide`)
    }



    setInterval(() => {
        let sphere = BABYLON.MeshBuilder.CreateSphere(`sphere`, { diameter: 0.5, segments: 32 }, scene)
        sphere.position.set(-10, 12, 0)
        sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.95,  }, scene)
        sphere.physicsImpostor.physicsBody.collisionFilterMask = 2
        // console.log(sphere.physicsImpostor.physicsBody)
        //sphere.physicsImpostor.physicsBody.collisionFilterMask = [ plane1.physicsImpostor.physicsBody, plane2.physicsImpostor.physicsBody ]
        plane1.physicsImpostor.registerOnPhysicsCollide(sphere.physicsImpostor, onCollide)
        plane2.physicsImpostor.registerOnPhysicsCollide(sphere.physicsImpostor, onCollide)
    }, 100)

    return scene
}

function isInBabylonPlayground() {
    return document.getElementById('pg-root') !== null
}

if (!isInBabylonPlayground()) {
    module.exports = createScene
}
