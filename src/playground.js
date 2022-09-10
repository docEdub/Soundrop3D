var createScene = function () {
    const ballPoolCount = 100
    const ballStartPosition = new BABYLON.Vector3(-10, 12, 0)
    const ballDropsPerMinute = 120

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

    const onBallCollide = (ballCollider, planeCollider, point) => {
        const ball = ballCollider.object
        const now = Date.now()
        if (200 < now - ball.lastCollisionTime) {
            const playbackRate = 8 * (1 / planeCollider.object.scaling.x)
            ball.tone.setPlaybackRate(playbackRate)
            ball.tone.play()
            ball.lastCollisionTime = now
        }
    }

    const ballPool = new Array(ballPoolCount)
    let ballsReady = false

    BABYLON.Engine.audioEngine.lock()
    BABYLON.Engine.audioEngine.onAudioUnlockedObservable.addOnce(() => {
        const tone = new BABYLON.Sound(`tone`, `tone.wav`, scene, () => {
            for (let i = 0; i < ballPoolCount; i++) {
                const ball = BABYLON.MeshBuilder.CreateSphere(`ball`, { diameter: 0.5, segments: 32 }, scene)
                ball.position.set(0, -1000, 0)

                ball.physicsImpostor = new BABYLON.PhysicsImpostor(ball, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.9 }, scene)
                ball.physicsImpostor.executeNativeFunction((world, body) => {
                    world.removeCollisionObject(body)
                    world.addRigidBody(body, 1, 2)
                })
                ball.physicsImpostor.registerOnPhysicsCollide(plane1.physicsImpostor, onBallCollide)
                ball.physicsImpostor.registerOnPhysicsCollide(plane2.physicsImpostor, onBallCollide)
                ball.lastCollisionTime = 0

                ball.tone = tone.clone(``)

                ballPool[i] = ball
            }

            const redMaterial = new BABYLON.StandardMaterial(`red`)
            redMaterial.diffuseColor.set(1, 0.5, 0.5)
            redMaterial.specularColor.set(1, 0.5, 0.5)
            ballPool[0].material = redMaterial

            ballsReady = true
        })
    })


    let ballPoolIndex = 0

    const dropBall = () => {
        if (!ballsReady) {
            return
        }

        // console.debug(`dropping ball index ${ballPoolIndex}`)
        const ball = ballPool[ballPoolIndex]
        ball.physicsImpostor.setAngularVelocity(BABYLON.Vector3.ZeroReadOnly)
        ball.physicsImpostor.setLinearVelocity(BABYLON.Vector3.ZeroReadOnly)
        ball.position.copyFrom(ballStartPosition)

        ballPoolIndex = (ballPoolIndex + 1) % ballPoolCount
    }

    let ballDropTimePeriodInMs = 1000 * (60 / ballDropsPerMinute)
    let timeFromLastBallDropInMs = 0

    scene.registerBeforeRender(() => {
        timeFromLastBallDropInMs += engine.getDeltaTime()
        if (ballDropTimePeriodInMs < timeFromLastBallDropInMs) {
            timeFromLastBallDropInMs -= ballDropTimePeriodInMs
            dropBall()
        }
    })

    return scene
}

function isInBabylonPlayground() {
    return document.getElementById('pg-root') !== null
}

if (!isInBabylonPlayground()) {
    module.exports = createScene
}
