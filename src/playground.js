var createScene = function () {
    const BallPoolCount = 200
    const BallDropsPerMinute = 120

    const scene = new BABYLON.Scene(engine)
    scene.enablePhysics(new BABYLON.Vector3(0, -4, 0), new BABYLON.AmmoJSPlugin(false, ammo))

    const camera = new BABYLON.ArcRotateCamera(`camera`, -Math.PI / 2, Math.PI / 2, 50, BABYLON.Vector3.ZeroReadOnly)
    camera.attachControl(null, true)

    const light = new BABYLON.HemisphericLight(`light`, new BABYLON.Vector3(0, 1, 0), scene)
    light.intensity = 0.7

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
                    tone.setPlaybackRate(64 * (1 / planeMesh.scaling.x))
                    tone.play()
                }
            }
        }
    }

    //#endregion

    const ballPool = new Array(BallPoolCount)

    //#region class Plane

    const planeMeshPrototype = BABYLON.MeshBuilder.CreateBox(`plane mesh prototype`, { size: 1 })
    planeMeshPrototype.scaling.z = 0.1
    planeMeshPrototype.isVisible = false

    class Plane {
        constructor(startPoint) {
            this._.startPoint.copyFrom(startPoint)
        }

        set endPoint(value) {
            this._.endPoint.copyFrom(value)
            this._.onEndPointChanged()
        }

        _ = new class {
            startPoint = new BABYLON.Vector3
            endPoint = new BABYLON.Vector3
            mesh = null

            onEndPointChanged = () => {
                if (!this.mesh) {
                    this.mesh = planeMeshPrototype.clone(`plane`)
                }

                const mesh = this.mesh
                mesh.scaling.x = BABYLON.Vector3.Distance(this.startPoint, this.endPoint)

                BABYLON.Vector3.CenterToRef(this.startPoint, this.endPoint, mesh.position)

                mesh.rotationQuaternion = null
                mesh.rotateAround(mesh.position, BABYLON.Vector3.RightReadOnly, Math.PI / 2)

                const angle = -Math.atan2(this.endPoint.y - this.startPoint.y, this.endPoint.x - this.startPoint.x)
                mesh.rotateAround(mesh.position, BABYLON.Vector3.RightHandedForwardReadOnly, angle)

                mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.PlaneImpostor, { mass: 0, restitution: 1 }, scene)
                mesh.isVisible = true

                for (let i = 0; i < ballPool.length; i++) {
                    ballPool[i].addCollider(mesh.physicsImpostor)
                }
            }
        }
    }

    //#endregion

    let ballsReady = false

    const addPlane = (fromPoint, toPoint) => {
        if (!ballsReady) {
            return
        }
        const plane = new Plane(fromPoint)
        plane.endPoint = toPoint
    }

    BABYLON.Engine.audioEngine.lock()
    BABYLON.Engine.audioEngine.onAudioUnlockedObservable.addOnce(() => {
        const tone = new BABYLON.Sound(`tone`, `tone.wav`, scene, () => {
            for (let i = 0; i < BallPoolCount; i++) {
                const ball = new Ball(tone.clone(``))
                ballPool[i] = ball
            }

            ballsReady = true

            addPlane(new BABYLON.Vector3(-6, 0, 0), new BABYLON.Vector3(-20,  10, 0))
            addPlane(new BABYLON.Vector3( 4, 0, 0), new BABYLON.Vector3( 20,  10, 0))
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
