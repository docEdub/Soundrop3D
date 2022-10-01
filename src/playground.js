
var createScene = function () {
    //#region Constants

    const BoundsWidth = 5
    const BoundsHeight = BoundsWidth
    const BallPoolCount = 1000
    const BallRestitution = 0.98
    const BpmDefault = 60
    const BpmMin = 1
    const BpmMax = 240
    const Gravity = 3
    const PhysicsBoundsWidth = 1.25 * BoundsWidth
    const PhysicsBoundsHeight = 1.25 * BoundsHeight
    const PhysicsTickInMs = 4
    const ToneBaseNote = 33 // 55 hz

    const HalfPI = Math.PI / 2
    const TwoPI = 2 * Math.PI

    const HalfBoundsWidth = BoundsWidth / 2
    const HalfBoundsHeight = BoundsHeight / 2
    const HalfPhysicsBoundsWidth = PhysicsBoundsWidth / 2
    const HalfPhysicsBoundsHeight = PhysicsBoundsHeight / 2
    const BallRadius = BoundsWidth / 60
    const BallHueIncrement = 360 / BallPoolCount
    const MaxPlaneWidth = Math.sqrt(BoundsWidth * BoundsWidth + BoundsHeight * BoundsHeight)
    const PhysicsTickInSeconds = PhysicsTickInMs / 1000
    const PhysicsTickInSecondsSquared = PhysicsTickInSeconds * PhysicsTickInSeconds
    const PhysicsTickInSecondsSquaredTimesGravity = PhysicsTickInSecondsSquared * Gravity

    //#endregion

    //#region Tuning

    const tuning = new class Tuning {
        constructor() {
        }

        frequencyFromPlaneScaleX = (planeScaleX) => {
            let i = MaxPlaneWidth - planeScaleX
            i /= MaxPlaneWidth
            i *= this._.notes.length - 1
            i = Math.round(i)
            const note = this._.notes[i]
            const hz = Math.pow(2, (note - ToneBaseNote) / 12)
            return hz
        }

        _ = new class {
            constructor() {
                this.setToWholeToneScale(36, 96)
            }

            notes = []

            setToWholeToneScale = (lowNote, highNote) => {
                this.notes.length = 0
                for (let i = lowNote; i <= highNote; i+=2) {
                    this.notes.push(i)
                }
            }
        }
    }

    //#endregion

    //#region Scene setup

    const scene = new BABYLON.Scene(engine)

    const camera = new BABYLON.ArcRotateCamera(`camera`, -HalfPI, HalfPI, BoundsWidth * 1.5, BABYLON.Vector3.ZeroReadOnly)
    camera.attachControl()

    const light = new BABYLON.HemisphericLight(`light`, new BABYLON.Vector3(0, 1, 0), scene)
    light.intensity = 0.7

    //#endregion

    //#region Geometry functions

    const intersection = (a1, a2, b1, b2, out) => {
        // Return `false` if one of the line lengths is zero.
        if ((a1.x === a2.x && a1.y === a2.y) || (b1.x === b2.x && b1.y === b2.y)) {
            return false
        }

        denominator = ((b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y))

        // Return `false` if lines are parallel.
        if (denominator === 0) {
            return false
        }

        let ua = ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) / denominator
        let ub = ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) / denominator

        // Return `false` if the intersection is not on the segments.
        if (ua < 0 || 1 < ua || ub < 0 || 1 < ub) {
            return false
        }

        // Set out vector's x and y coordinates.
        out.x = a1.x + ua * (a2.x - a1.x)
        out.y = a1.y + ua * (a2.y - a1.y)

        return true
    }

    const toDegrees = (value) => {
        return (value / TwoPI) * 360
    }

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

    //#region class Plane

    const planeMeshPrototype = BABYLON.MeshBuilder.CreateBox(`plane mesh prototype`, { size: 1 })
    planeMeshPrototype.scaling.y = 0.25
    planeMeshPrototype.scaling.z = 0.01
    planeMeshPrototype.isPickable = false
    planeMeshPrototype.isVisible = false
    planeMeshPrototype.material = new BABYLON.StandardMaterial(`plane.material`)
    planeMeshPrototype.material.diffuseColor.set(0.1, 0.1, 0.1)
    planeMeshPrototype.material.emissiveColor.set(0.1, 0.1, 0.1)

    class Plane {
        static Array = []
        static PlaneMeshMap = new WeakMap

        constructor(startPoint) {
            this._.startPoint.copyFrom(startPoint)
        }

        get startPoint() {
            return this._.startPoint
        }

        get endPoint() {
            return this._.endPoint
        }

        set endPoint(value) {
            if (!this._.mesh) {
                this._.initializeMesh()
                Plane.Array.push(this)
                Plane.PlaneMeshMap.set(this._.mesh, this)
            }
            this._.endPoint.copyFrom(value)
            this._.resetPoints()
        }

        get angle() {
            return this._.angle
        }

        get playbackRate() {
            return this._.playbackRate
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
            const index = Plane.Array.indexOf(this)
            if (-1 < index) {
              Plane.Array.splice(index, 1)
            }
            Plane.PlaneMeshMap.delete(this._.mesh)
            this._.disable()
            this._ = null
        }

        onCollide = (color, collisionStrength) => {
            this._.onCollide(color, collisionStrength)
        }

        render = (deltaTime) => {
            this._.render(deltaTime)
        }

        _ = new class {
            startPoint = new BABYLON.Vector3
            endPoint = new BABYLON.Vector3
            angle = 0
            playbackRate = 1
            mesh = null
            color = new BABYLON.Color3

            initializeMesh = () => {
                const mesh = this.mesh = planeMeshPrototype.clone(`plane`)
                mesh.material = mesh.material.clone(``)
                this.color = mesh.material.diffuseColor

                mesh.isVisible = true
            }

            resetPoints = () => {
                const mesh = this.mesh
                mesh.scaling.x = BABYLON.Vector3.Distance(this.startPoint, this.endPoint)
                this.playbackRate = tuning.frequencyFromPlaneScaleX(mesh.scaling.x)

                BABYLON.Vector3.CenterToRef(this.startPoint, this.endPoint, mesh.position)

                mesh.rotationQuaternion = null
                mesh.rotateAround(mesh.position, BABYLON.Vector3.RightReadOnly, HalfPI)

                let angle = Math.atan2(this.endPoint.y - this.startPoint.y, this.endPoint.x - this.startPoint.x)
                mesh.rotateAround(mesh.position, BABYLON.Vector3.RightHandedForwardReadOnly, -angle)

                if (angle < 0) {
                    angle += TwoPI
                }
                this.angle = angle
            }

            disable = () => {
                this.mesh.isVisible = false
            }

            onCollide = (color, colorStrength) => {
                this.color.r = Math.max(this.color.r, colorStrength * color.r)
                this.color.g = Math.max(this.color.g, colorStrength * color.g)
                this.color.b = Math.max(this.color.b, colorStrength * color.b)
            }

            render = (deltaTime) => {
                if (!this.mesh) {
                    return
                }
                deltaTime *= 3
                this.color.r -= deltaTime
                this.color.g -= deltaTime
                this.color.b -= deltaTime
                this.color.r = Math.max(0.1, this.color.r)
                this.color.g = Math.max(0.1, this.color.g)
                this.color.b = Math.max(0.1, this.color.b)
            }
        }
    }

    //#endregion

    //#region class BallPhysics

    class BallPhysics {
        static StartPosition = new BABYLON.Vector3(-HalfBoundsWidth * 0.75, HalfBoundsHeight * 0.95, 0)
        static IntersectionPoint = new BABYLON.Vector3

        onCollideObservable = new BABYLON.Observable
        position = new BABYLON.Vector3(0, -1000, 0)

        previousPosition = new BABYLON.Vector3
        velocity = new BABYLON.Vector3

        drop = () => {
            this.position.copyFrom(BallPhysics.StartPosition)
            this.previousPosition.copyFrom(BallPhysics.StartPosition)
            this.velocity.set(0, 0, 0)
        }

        tick = () => {
            this.previousPosition.copyFrom(this.position)
            this.position.set(
                this.position.x + this.velocity.x,
                this.position.y + this.velocity.y,
                this.position.z + this.velocity.z
            )
            this.velocity.y -= PhysicsTickInSecondsSquaredTimesGravity

            // Skip plane intersection calculations when ball is out of bounds.
            if (this.position.x < -HalfPhysicsBoundsWidth
                    || HalfPhysicsBoundsWidth < this.position.x
                    || this.position.y < -HalfPhysicsBoundsHeight
                    || HalfPhysicsBoundsHeight < this.position.y) {
                return
            }
            let ballAngle = Math.atan2(this.velocity.y, this.velocity.x)
            if (ballAngle < 0) {
                ballAngle += TwoPI
            }

            let lastPlaneHit = null

            let loopResetCount = 0
            for (let i = 0; i < Plane.Array.length; i++) {
                const plane = Plane.Array[i]

                if (intersection(this.previousPosition, this.position, plane.startPoint, plane.endPoint, Ball.intersectionPoint)) {
                    if (lastPlaneHit === plane) {
                        continue
                    }
                    lastPlaneHit = plane

                    const speed = this.velocity.length() * BallRestitution

                    let differenceAngle = plane.angle - ballAngle
                    if (differenceAngle < 0) {
                        differenceAngle += TwoPI
                    }

                    const previousBallAngle = ballAngle
                    ballAngle = plane.angle + differenceAngle
                    if (ballAngle < 0) {
                        ballAngle += TwoPI
                    }

                    this.onCollideObservable.notifyObservers({ plane: plane, bounceAngle: previousBallAngle - ballAngle, speed: speed })

                    this.velocity.set(
                        speed * Math.cos(ballAngle),
                        speed * Math.sin(ballAngle),
                        0
                    )



                    this.previousPosition.copyFrom(Ball.intersectionPoint)
                    this.position.set(
                        Ball.intersectionPoint.x + this.velocity.x,
                        Ball.intersectionPoint.y + this.velocity.y,
                        0
                    )

                    // Test each plane for intersections again with the updated positions.
                    i = 0
                    loopResetCount += 1
                    if (10 < loopResetCount) {
                        break
                    }
                }
            }
        }
    }

    //#endregion

    //#region class Ball

    const BallMesh = BABYLON.MeshBuilder.CreateSphere(`ball`, { diameter: BallRadius, segments: 16 }, scene)
    BallMesh.isVisible = false

    class Ball {
        static StartPosition = new BABYLON.Vector3(-BoundsWidth * 0.375, BoundsHeight * 0.375, 0)
        static Hue = 0
        static intersectionPoint = new BABYLON.Vector3

        static InstanceColors = new Float32Array(4 * BallPoolCount)
        static InstanceMatrices = new Float32Array(16 * BallPoolCount)
        static InstanceMatricesDirty = true
        static InstanceColorsDirty = true

        static CreateInstances = () => {
            Ball.InstanceColors.fill(0)
            Ball.InstanceMatrices.fill(0)

            // Set matrices to identity.
            for (let i = 0; i < BallPoolCount; i++) {
                const matrixIndex = 16 * i
                Ball.InstanceMatrices[matrixIndex] = 1
                Ball.InstanceMatrices[matrixIndex + 5] = 1
                Ball.InstanceMatrices[matrixIndex + 10] = 1
                Ball.InstanceMatrices[matrixIndex + 15] = 1

                const ball = ballPool[i]
                const color = ball.color
                const colorIndex = 4 * i
                Ball.InstanceColors[colorIndex] = color.r
                Ball.InstanceColors[colorIndex + 1] = color.g
                Ball.InstanceColors[colorIndex + 2] = color.b
                Ball.InstanceColors[colorIndex + 3] = 0
            }

            BallMesh.thinInstanceSetBuffer(`matrix`, Ball.InstanceMatrices, 16, false)
            BallMesh.thinInstanceSetBuffer(`color`, Ball.InstanceColors, 4, false)
            Ball.UpdateInstances()

            BallMesh.isVisible = true
        }

        static UpdateInstances = () => {
            if (Ball.InstanceMatricesDirty) {
                Ball.InstanceMatricesDirty = false
                BallMesh.thinInstanceBufferUpdated(`matrix`)
            }
            if (Ball.InstanceColorsDirty) {
                Ball.InstanceColorsDirty = false
                BallMesh.thinInstanceBufferUpdated(`color`)
            }
        }

        constructor(index, tone) {
            this._.index = index
            this._.colorIndex = 4 * index
            this._.matrixIndex = 16 * index
            this._.tone = tone

            BABYLON.Color3.HSVtoRGBToRef(Ball.Hue, 0.75, 1, this._.color)
            Ball.Hue += BallHueIncrement

            this._.updateInstanceColor()
            this._.updateInstancePosition()
        }

        get color() {
            return this._.color
        }

        get position() {
            return this._.currentPosition
        }

        drop = () => {
            this._.drop()
        }

        render = (deltaTime) => {
            this._.render(deltaTime)
        }

        _ = new class {
            index = 0
            colorIndex = 0
            matrixIndex = 0
            isVisible = false
            tone = null
            color = new BABYLON.Color3
            ballPhysics = new BallPhysics
            lastPhysicsTickInMs = 0

            constructor() {
                this.ballPhysics.onCollideObservable.add(this.onCollide)
            }

            updateInstanceColor = () => {
                const colorIndex = this.colorIndex
                const color = this.color
                Ball.InstanceColors[colorIndex] = color.r
                Ball.InstanceColors[colorIndex + 1] = color.g
                Ball.InstanceColors[colorIndex + 2] = color.b
                Ball.InstanceColors[colorIndex + 3] = this.isVisible ? 1 : 0
                Ball.InstanceColorsDirty = true
            }

            updateInstancePosition = () => {
                const matrixIndex = this.matrixIndex
                const position = this.ballPhysics.position
                Ball.InstanceMatrices[matrixIndex + 12] = position.x
                Ball.InstanceMatrices[matrixIndex + 13] = position.y
                Ball.InstanceMatricesDirty = true
            }

            drop = () => {
                this.ballPhysics.drop()
                this.updateInstancePosition()

                if (!this.isVisible) {
                    this.isVisible = true
                    this.updateInstanceColor()
                }
            }

            onCollide = (eventData) => { // plane, bounceAngle, speed) => {
                let bounceAngle = Math.abs(eventData.bounceAngle)
                if (bounceAngle < 0.1) {
                    return
                }

                const tone = this.tone
                tone.setPlaybackRate(eventData.plane.playbackRate)
                let volume = Math.min(bounceAngle * eventData.speed * 10, 1)
                const amplitude = Math.pow(2, volume) - 1
                tone.setVolume(amplitude)
                tone.play()

                let colorStrength = volume
                colorStrength = (Math.log(colorStrength + 0.01) / Math.log(100)) + 1
                colorStrength = (Math.log(colorStrength + 0.01) / Math.log(100)) + 1
                eventData.plane.onCollide(this.color, colorStrength)
            }

            onPhysicsTick = () => {
                this.ballPhysics.tick()
                this.updateInstancePosition()
            }

            render = (deltaTimeInMs) => {
                this.lastPhysicsTickInMs += deltaTimeInMs
                while (PhysicsTickInMs < this.lastPhysicsTickInMs) {
                    this.onPhysicsTick()
                    this.lastPhysicsTickInMs -= PhysicsTickInMs
                }
            }
        }
    }

    const ballPool = new Array(BallPoolCount)

    //#endregion

    //#region Ball handling

    let ballsReady = false

    BABYLON.Engine.audioEngine.lock()
    BABYLON.Engine.audioEngine.onAudioUnlockedObservable.addOnce(() => {
        const tone = new BABYLON.Sound(`tone`, `tone.wav`, scene, () => {
            for (let i = 0; i < BallPoolCount; i++) {
                const ball = new Ball(i, tone.clone(``))
                ballPool[i] = ball
            }

            ballsReady = true
            Ball.CreateInstances()
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
        const deltaTimeInMs = engine.getDeltaTime()
        timeFromLastBallDropInMs += deltaTimeInMs
        if (ballDropTimePeriodInMs < timeFromLastBallDropInMs) {
            timeFromLastBallDropInMs -= ballDropTimePeriodInMs
            dropBall()
        }

        if (ballsReady) {
            for (let i = 0; i < ballPool.length; i++) {
                ballPool[i].render(deltaTimeInMs)
            }
            Ball.UpdateInstances()
        }
    })

    //#endregion

    //#region Plane handling

    scene.registerBeforeRender(() => {
        const deltaTime = engine.getDeltaTime() / 1000
        for (let i = 0; i < Plane.Array.length; i++) {
            Plane.Array[i].render(deltaTime)
        }
    })

    //#endregion

    //#region class GuideLine

    const guideline = new class GuideLine {
        static PointCount = 100000

        update = () => {
            this._.update()
        }

        _ = new class {
            ballPhysics = new BallPhysics
            points = new Array(GuideLine.PointCount)
            pointCloud = new BABYLON.PointsCloudSystem(`guideline`, 2, scene, { updatable: true })

            constructor() {
                for (let i = 0; i < GuideLine.PointCount; i++) {
                    this.points[i] = new BABYLON.Vector3
                }

                this.pointCloud.updateParticle = this.updatePointCloudParticle
                this.pointCloud.addPoints(GuideLine.PointCount)
                this.pointCloud.buildMeshAsync().then(() => {
                    this.pointCloud.mesh.visibility = 0.1
                    this.update()
                })
            }

            updatePointCloudParticle = (particle) => {
                particle.position.copyFrom(this.points[particle.idx])
                return particle
            }

            update = () => {
                const ball = this.ballPhysics
                const position = ball.position

                ball.drop()
                this.points[0].copyFrom(position)

                let i = 1
                for (; i < GuideLine.PointCount; i++) {
                    ball.tick()
                    this.points[i].copyFrom(position)
                    if (position.x < -BoundsWidth || BoundsWidth < position.x || position.y < -BoundsHeight) {
                        break
                    }
                }

                // Set all leftover points to the same position as the last point instead of deleting them.
                for (; i < GuideLine.PointCount; i++) {
                    this.points[i].copyFrom(position)
                }

                this.pointCloud.setParticles(0, GuideLine.PointCount)
            }
        }
    }

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
                bpmSlider.minimum = BpmMin
                bpmSlider.maximum = BpmMax
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
                            guideline.update()
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
                        guideline.update()
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
