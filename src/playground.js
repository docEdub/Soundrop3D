var createScene = function () {
    //#region Constants

    const BoundsWidth = 5
    const BoundsHeight = BoundsWidth
    const BallPoolCount = 200
    const BpmDefault = 60
    const BpmMin = 40
    const BpmMax = 240

    const HalfBoundsWidth = BoundsWidth / 2
    const HalfBoundsHeight = BoundsHeight / 2
    const BallHueIncrement = 360 / BallPoolCount

    //#endregion

    //#region Scene setup

    const scene = new BABYLON.Scene(engine)
    scene.enablePhysics(new BABYLON.Vector3(0, -1, 0), new BABYLON.AmmoJSPlugin(false, ammo))

    const camera = new BABYLON.ArcRotateCamera(`camera`, -Math.PI / 2, Math.PI / 2, BoundsWidth * 1.5, BABYLON.Vector3.ZeroReadOnly)
    camera.attachControl()

    const light = new BABYLON.HemisphericLight(`light`, new BABYLON.Vector3(0, 1, 0), scene)
    light.intensity = 0.7

    //#endregion

    //#region class Border
    const border = new class Border {
        constructor() {
        }

        _ = new class {
            constructor() {
                const mesh = BABYLON.MeshBuilder.CreateLines(`border`, { points: [
                    new BABYLON.Vector3(-HalfBoundsWidth,  HalfBoundsHeight, 0),
                    new BABYLON.Vector3( HalfBoundsWidth,  HalfBoundsHeight, 0),
                    new BABYLON.Vector3( HalfBoundsWidth, -HalfBoundsHeight, 0),
                    new BABYLON.Vector3(-HalfBoundsWidth, -HalfBoundsHeight, 0),
                    new BABYLON.Vector3(-HalfBoundsWidth,  HalfBoundsHeight, 0)
                ]})
                const material = new BABYLON.StandardMaterial(`border.material`)
                mesh.material = material
                mesh.isPickable = false
            }
        }
    }

    //#endregion

    //#region class Ball

    class Ball {
        static StartPosition = new BABYLON.Vector3(-BoundsWidth * 0.375, BoundsHeight * 0.375, 0)
        static Hue = 0

        constructor(tone) {
            this._.tone = tone

            const mesh = BABYLON.MeshBuilder.CreateSphere(`ball`, { diameter: BoundsWidth / 80, segments: 32 }, scene)
            mesh.position.set(0, -1000, 0)
            mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, friction: 0, restitution: 0.9 }, scene)
            mesh.physicsImpostor.executeNativeFunction((world, body) => {
                world.removeCollisionObject(body)
                world.addRigidBody(body, 1, 2)
            })
            this._.mesh = mesh

            const material = new BABYLON.StandardMaterial(``)
            BABYLON.Color3.HSVtoRGBToRef(Ball.Hue, 0.75, 1, material.diffuseColor)
            Ball.Hue += BallHueIncrement
            mesh.material = material
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
                    tone.setPlaybackRate(32 * (1 / planeMesh.scaling.x))
                    tone.setVolume(this.physicsImposter.getLinearVelocity().lengthSquared() / 25)
                    tone.play()
                }
            }
        }
    }

    const ballPool = new Array(BallPoolCount)

    //#endregion

    //#region class Plane

    const planeMeshPrototype = BABYLON.MeshBuilder.CreateBox(`plane mesh prototype`, { size: 1 })
    planeMeshPrototype.scaling.z = 0.1
    planeMeshPrototype.isPickable = false
    planeMeshPrototype.isVisible = false

    class Plane {
        static PlaneMeshMap = new WeakMap

        constructor(startPoint) {
            this._.startPoint.copyFrom(startPoint)
        }

        set endPoint(value) {
            if (!this._.mesh) {
                this._.initializeMesh()
                Plane.PlaneMeshMap.set(this._.mesh, this)
            }
            this._.endPoint.copyFrom(value)
            this._.resetPoints()
        }

        freeze = () => {
            if (!!this._.mesh) {
                this._.mesh.isPickable = true
                this._.mesh.freezeWorldMatrix()
            }
        }

        resetPoints = () => {
            this._.resetPoints()
        }

        disable = () => {
            Plane.PlaneMeshMap.delete(this._.mesh)
            this._.disable()
            this._ = null
        }

        _ = new class {
            startPoint = new BABYLON.Vector3
            endPoint = new BABYLON.Vector3
            mesh = null

            initializeMesh = () => {
                const mesh = this.mesh = planeMeshPrototype.clone(`plane`)
                mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, BABYLON.PhysicsImpostor.PlaneImpostor, { mass: 0, friction: 0, restitution: 1 }, scene)
                mesh.isVisible = true
                for (let i = 0; i < ballPool.length; i++) {
                    ballPool[i].addCollider(mesh.physicsImpostor)
                }
            }

            resetPoints = () => {
                const mesh = this.mesh
                mesh.scaling.x = BABYLON.Vector3.Distance(this.startPoint, this.endPoint)

                BABYLON.Vector3.CenterToRef(this.startPoint, this.endPoint, mesh.position)

                mesh.rotationQuaternion = null
                mesh.rotateAround(mesh.position, BABYLON.Vector3.RightReadOnly, Math.PI / 2)

                const angle = -Math.atan2(this.endPoint.y - this.startPoint.y, this.endPoint.x - this.startPoint.x)
                mesh.rotateAround(mesh.position, BABYLON.Vector3.RightHandedForwardReadOnly, angle)

                mesh.physicsImpostor.forceUpdate()
            }

            disable = () => {
                const mesh = this.mesh
                for (let i = 0; i < ballPool.length; i++) {
                    ballPool[i].removeCollider(mesh.physicsImpostor)
                }
                mesh.position.set(0, 0, -100000)
                mesh.isVisible = false
            }
        }
    }

    //#endregion

    //#region Ball handling

    let ballsReady = false

    BABYLON.Engine.audioEngine.lock()
    BABYLON.Engine.audioEngine.onAudioUnlockedObservable.addOnce(() => {
        const tone = new BABYLON.Sound(`tone`, `tone.wav`, scene, () => {
            for (let i = 0; i < BallPoolCount; i++) {
                const ball = new Ball(tone.clone(``))
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

    let bpm = BpmDefault
    let ballDropTimePeriodInMs = 1000 * (60 / BpmDefault)

    const setBpm = (value) => {
        bpm = Math.max(BpmMin, Math.min(value, BpmMax))
        ballDropTimePeriodInMs = 1000 * (60 / bpm)
    }

    let timeFromLastBallDropInMs = 0

    scene.registerBeforeRender(() => {
        timeFromLastBallDropInMs += engine.getDeltaTime()
        if (ballDropTimePeriodInMs < timeFromLastBallDropInMs) {
            timeFromLastBallDropInMs -= ballDropTimePeriodInMs
            dropBall()
        }
    })

    //#endregion

    //#region GUI

    const gui = new class Gui {
        constructor() {
        }

        get mode() {
            return this._.mode
        }

        _ = new class {
            constructor() {
                const manager = new BABYLON.GUI.GUI3DManager(scene)

                const bpmDownButton = new BABYLON.GUI.Button3D(`gui.bpm.downButton`)
                manager.addControl(bpmDownButton)
                bpmDownButton.scaling.set(0.2, 0.2, 0.1)
                bpmDownButton.content = new BABYLON.GUI.TextBlock(`gui.bpm.downButton.text`, `-`)
                bpmDownButton.content.fontSize = 24
                bpmDownButton.content.color = `white`
                bpmDownButton.content.scaleX = 1 / bpmDownButton.scaling.x
                bpmDownButton.content.scaleY = 1 / bpmDownButton.scaling.y
                bpmDownButton.onPointerClickObservable.add(() => {
                    setBpm(bpm - 1)
                    this.updateUiText()
                })
                this.addTopLeftControl(bpmDownButton)

                const bpmUpButton = new BABYLON.GUI.Button3D(`gui.bpm.upButton`)
                manager.addControl(bpmUpButton)
                bpmUpButton.scaling.set(0.2, 0.2, 0.1)
                bpmUpButton.content = new BABYLON.GUI.TextBlock(`gui.bpm.upButton.text`, `+`)
                bpmUpButton.content.fontSize = 24
                bpmUpButton.content.color = `white`
                bpmUpButton.content.scaleX = 1 / bpmUpButton.scaling.x
                bpmUpButton.content.scaleY = 1 / bpmUpButton.scaling.y
                bpmUpButton.onPointerClickObservable.add(() => {
                    setBpm(bpm + 1)
                    this.updateUiText()
                })
                this.addTopLeftControl(bpmUpButton)

                const bpmTextButton = new BABYLON.GUI.Button3D(`gui.bpm.text.button`)
                manager.addControl(bpmTextButton)
                bpmTextButton.scaling.set(0.5, 0.2, 0.1)
                bpmTextButton.node.isPickable = false
                bpmTextButton.mesh.material.diffuseColor.set(0.75, 0.75, 0.75)
                this.addTopLeftControl(bpmTextButton)

                const bpmText = new BABYLON.GUI.TextBlock(`gui.bpm.text`)
                bpmTextButton.content = bpmText
                bpmText.color = `white`
                bpmText.fontSize = 24
                bpmText.text = `${BpmDefault} bpm`
                bpmText.scaleX = 1 / bpmTextButton.scaling.x
                bpmText.scaleY = 1 / bpmTextButton.scaling.y
                this.bpmText = bpmText

                const bpmSlider = new BABYLON.GUI.Slider3D(`gui.bpm.slider`)
                manager.addControl(bpmSlider)
                bpmSlider.position.z = 0.065
                bpmSlider.minimum = 40
                bpmSlider.maximum = 240
                bpmSlider.value = BpmDefault
                bpmSlider.onValueChangedObservable.add((value) => {
                    setBpm(Math.round(value))
                    this.updateUiText()
                })
                this.addTopLeftControl(bpmSlider, 0.9)
                this.bpmSlider = bpmSlider

                const modeCameraButton = new BABYLON.GUI.Button3D(`gui.mode.cameraButton`)
                manager.addControl(modeCameraButton)
                modeCameraButton.scaling.set(0.6, 0.2, 0.1)
                modeCameraButton.content = new BABYLON.GUI.TextBlock(`gui.mode.cameraButton.text`, `Camera`)
                modeCameraButton.content.color = `white`
                modeCameraButton.content.fontSize = 24
                modeCameraButton.content.scaleX = 1 / modeCameraButton.scaling.x
                modeCameraButton.content.scaleY = 1 / modeCameraButton.scaling.y
                modeCameraButton.onPointerClickObservable.add(() => { this.switchToCameraMode() })
                this.addTopRightControl(modeCameraButton)
                this.modeCameraButton = modeCameraButton

                const modeEraseButton = new BABYLON.GUI.Button3D(`gui.mode.eraseButton`)
                manager.addControl(modeEraseButton)
                modeEraseButton.scaling.set(0.6, 0.2, 0.1)
                modeEraseButton.content = new BABYLON.GUI.TextBlock(`gui.mode.eraseButton.text`, `Erase`)
                modeEraseButton.content.color = `white`
                modeEraseButton.content.fontSize = 24
                modeEraseButton.content.scaleX = 1 / modeEraseButton.scaling.x
                modeEraseButton.content.scaleY = 1 / modeEraseButton.scaling.y
                modeEraseButton.onPointerClickObservable.add(() => { this.switchToEraseMode() })
                this.addTopRightControl(modeEraseButton)
                this.modeEraseButton = modeEraseButton

                const modeDrawButton = new BABYLON.GUI.Button3D(`gui.mode.drawButton`)
                manager.addControl(modeDrawButton)
                modeDrawButton.scaling.set(0.6, 0.2, 0.1)
                modeDrawButton.content = new BABYLON.GUI.TextBlock(`gui.mode.drawButton.text`, `Draw`)
                modeDrawButton.content.color = `white`
                modeDrawButton.content.fontSize = 24
                modeDrawButton.content.scaleX = 1 / modeDrawButton.scaling.x
                modeDrawButton.content.scaleY = 1 / modeDrawButton.scaling.y
                modeDrawButton.onPointerClickObservable.add(() => { this.switchToDrawMode() })
                this.addTopRightControl(modeDrawButton)
                this.modeDrawButton = modeDrawButton

                this.switchToDrawMode()
            }

            bpmSlider = null
            bpmText = null
            modeDrawButton = null
            modeEraseButton = null
            modeCameraButton = null

            get xLeft() { return -BoundsWidth / 2 }
            get yTop() { return BoundsHeight / 2 + 0.1 }

            margin = 0.01
            xForNextTopLeftControl = this.xLeft
            xForNextTopRightControl = this.xLeft + BoundsWidth

            mode = ``

            addTopLeftControl = (control, width) => {
                if (width === undefined) {
                    const mesh = control.mesh
                    const bounds = mesh.getBoundingInfo()
                    width = (bounds.maximum.x - bounds.minimum.x) * mesh.scaling.x
                }

                control.position.x = this.xForNextTopLeftControl + width / 2
                control.position.y = this.yTop

                this.xForNextTopLeftControl += width + this.margin
            }

            addTopRightControl = (control, width) => {
                if (width === undefined) {
                    const mesh = control.mesh
                    const bounds = mesh.getBoundingInfo()
                    width = (bounds.maximum.x - bounds.minimum.x) * mesh.scaling.x
                }

                control.position.x = this.xForNextTopRightControl - width / 2
                control.position.y = this.yTop

                this.xForNextTopRightControl -= width + this.margin
            }

            switchToDrawMode = () => {
                this.mode = `DrawMode`
                this.updateUiText()
                camera.detachControl()
            }

            switchToEraseMode = () => {
                this.mode = `EraseMode`
                this.updateUiText()
                camera.detachControl()
            }

            switchToCameraMode = () => {
                this.mode = `CameraMode`
                this.updateUiText()
                camera.attachControl()
            }

            updateUiText = () => {
                this.bpmSlider.value = bpm
                this.bpmText.text = `${bpm} bpm`

                this.modeDrawButton.mesh.material.diffuseColor.set(0.5, 0.5, 0.5)
                this.modeEraseButton.mesh.material.diffuseColor.set(0.5, 0.5, 0.5)
                this.modeCameraButton.mesh.material.diffuseColor.set(0.5, 0.5, 0.5)
                let currentModeButton = null
                if (this.mode === `DrawMode`) {
                    currentModeButton = this.modeDrawButton
                }
                if (this.mode === `EraseMode`) {
                    currentModeButton = this.modeEraseButton
                }
                if (this.mode === `CameraMode`) {
                    currentModeButton = this.modeCameraButton
                }
                currentModeButton.mesh.material.diffuseColor.set(0.9, 0.9, 0.9)
            }
        }
    }

    //#endregion

    //#region Pointer handling

    const hitPointPlaneForDrawing = BABYLON.MeshBuilder.CreatePlane(`drawing plane`, { width: 2 * BoundsWidth, height: 2 * BoundsHeight })
    hitPointPlaneForDrawing.visibility = 0
    let planeBeingAdded = null

    const startAddingPlane = (startPoint) => {
        startPoint.x = Math.max(-HalfBoundsWidth, Math.min(startPoint.x, HalfBoundsWidth))
        startPoint.y = Math.max(-HalfBoundsHeight, Math.min(startPoint.y, HalfBoundsHeight))
        startPoint.z = 0
        planeBeingAdded = new Plane(startPoint)
    }

    const finishAddingPlane = () => {
        if (planeBeingAdded) {
            planeBeingAdded.freeze()
        }
        planeBeingAdded = null
    }

    scene.onPointerObservable.add((pointerInfo) => {
        if (!ballsReady) {
            return
        }

        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                if (pointerInfo.pickInfo.hit) {
                    if (gui.mode === `DrawMode`) {
                        startAddingPlane(pointerInfo.pickInfo.pickedPoint)
                    }
                    else if (gui.mode === `EraseMode`) {
                        const pickedMesh = pointerInfo.pickInfo.pickedMesh
                        if (Plane.PlaneMeshMap.has(pickedMesh)) {
                            Plane.PlaneMeshMap.get(pickedMesh).disable()
                        }
                    }
                }

                break

            case BABYLON.PointerEventTypes.POINTERMOVE:
                if (planeBeingAdded) {
                    const pickInfo = scene.pick(scene.pointerX, scene.pointerY)
                    if (pickInfo.hit) {
                        const pickedPoint = pickInfo.pickedPoint
                        pickedPoint.x = Math.max(-HalfBoundsWidth, Math.min(pickedPoint.x, HalfBoundsWidth))
                        pickedPoint.y = Math.max(-HalfBoundsHeight, Math.min(pickedPoint.y, HalfBoundsHeight))
                        pickedPoint.z = 0
                        planeBeingAdded.endPoint = pickedPoint
                    }
                }

                break

            case BABYLON.PointerEventTypes.POINTERUP:
                finishAddingPlane()
                break
        }
    })

    //#endregion

    //#region XR

    const startXr = async () => {
        try {
            const xr = await scene.createDefaultXRExperienceAsync({})
            if (!!xr && !!xr.enterExitUI) {
                xr.enterExitUI.activeButtonChangedObservable.add(() => {
                    BABYLON.Engine.audioEngine.unlock()
                })
            }
        }
        catch(e) {
            console.debug(e)
        }
    }
    startXr()

    //#endregion

    return scene
}

function isInBabylonPlayground() {
    return document.getElementById('pg-root') !== null
}

if (!isInBabylonPlayground()) {
    module.exports = createScene
}
