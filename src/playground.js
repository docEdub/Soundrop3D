var createScene = function () {
    const BallPoolCount = 200
    const BallDropsPerMinute = 120

    const scene = new BABYLON.Scene(engine)
    scene.enablePhysics(new BABYLON.Vector3(0, -4, 0), new BABYLON.AmmoJSPlugin(false, ammo))

    const camera = new BABYLON.ArcRotateCamera(`camera`, -Math.PI / 2, Math.PI / 2, 50, BABYLON.Vector3.ZeroReadOnly)
    camera.attachControl(null, true)

    const light = new BABYLON.HemisphericLight(`light`, new BABYLON.Vector3(0, 1, 0), scene)
    light.intensity = 0.7

    const plane1 = BABYLON.MeshBuilder.CreateBox(`plane 1`, { size: 8 })
    plane1.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightReadOnly, Math.PI / 2)
    plane1.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightHandedForwardReadOnly, Math.PI / 8)
    plane1.scaling.y = 0.25
    plane1.scaling.z = 0.01
    plane1.position.set(-7, 0, 0)
    plane1.physicsImpostor = new BABYLON.PhysicsImpostor(plane1, BABYLON.PhysicsImpostor.PlaneImpostor, { mass: 0, restitution: 1 }, scene)

    const plane2 = plane1.clone(`plane 2`, null, false, false)
    plane2.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightHandedForwardReadOnly, -Math.PI / 3)
    plane2.scaling.x = 2
    plane2.position.set(7, 0, 0)
    plane2.physicsImpostor = new BABYLON.PhysicsImpostor(plane2, BABYLON.PhysicsImpostor.PlaneImpostor, { mass: 0, restitution: 1 }, scene)

    //#region class Ball

    class Ball {
        static StartPosition = new BABYLON.Vector3(-10, 12, 0)

        constructor(tone) {
            this._.tone = tone

            const mesh = BABYLON.MeshBuilder.CreateSphere(`ball`, { diameter: 0.5, segments: 32 }, scene)
            mesh.position.set(0, -1000, 0)
            mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.95 }, scene)
            mesh.physicsImpostor.executeNativeFunction((world, body) => {
                world.removeCollisionObject(body)
                world.addRigidBody(body, 1, 2)
            })
            this._.mesh = mesh
        }

        addCollider = (physicsImposter) => {
            this._.addCollider(physicsImposter)
        }

        removeCollider = (physicsImposter) => {
            this._.removeCollider(physicsImposter)
        }

        drop = () => {
            this._.drop()
        }

        _ = new class {
            lastCollisionTime = 0
            mesh = null
            tone = null

            get physicsImposter() {
                return this.mesh.physicsImpostor
            }

            drop = () => {
                const physicsImposter = this.physicsImposter
                physicsImposter.setAngularVelocity(BABYLON.Vector3.ZeroReadOnly)
                physicsImposter.setLinearVelocity(BABYLON.Vector3.ZeroReadOnly)

                const mesh = this.mesh
                mesh.position.copyFrom(Ball.StartPosition)
            }

            addCollider = (physicsImposter) => {
                this.physicsImposter.registerOnPhysicsCollide(physicsImposter, this.onCollide)
            }

            removeCollider = (physicsImposter) => {
                this.physicsImposter.unregisterOnPhysicsCollide(physicsImposter, this.onCollide)
            }

            onCollide = (ballCollider, planeCollider) => {
                const planeMesh = planeCollider.object
                if (!planeMesh) {
                    return
                }

                const now = Date.now()
                if (200 < now - this.lastCollisionTime) {
                    this.lastCollisionTime = now

                    const tone = this.tone
                    tone.setPlaybackRate(8 * (1 / planeMesh.scaling.x))
                    tone.play()
                }
            }
        }
    }

    //#endregion

    const ballPool = new Array(BallPoolCount)
    let ballsReady = false

    BABYLON.Engine.audioEngine.lock()
    BABYLON.Engine.audioEngine.onAudioUnlockedObservable.addOnce(() => {
        const tone = new BABYLON.Sound(`tone`, `tone.wav`, scene, () => {
            for (let i = 0; i < BallPoolCount; i++) {
                const ball = new Ball(tone.clone(``))
                ball.addCollider(plane1.physicsImpostor)
                ball.addCollider(plane2.physicsImpostor)
                ballPool[i] = ball
            }

            ballsReady = true
        })
    })

    let nextBallPoolIndex = 0

    const dropBall = () => {
        if (!ballsReady) {
            return
        }

        // console.debug(`dropping ball index ${nextBallPoolIndex}`)
        const ball = ballPool[nextBallPoolIndex]
        ball.drop()
        nextBallPoolIndex = (nextBallPoolIndex + 1) % BallPoolCount
    }

    let ballDropTimePeriodInMs = 1000 * (60 / BallDropsPerMinute)
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
