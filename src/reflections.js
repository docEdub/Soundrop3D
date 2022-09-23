var createScene = function () {
    //#region Constants

    const BoundsWidth = 5
    const BoundsHeight = BoundsWidth
    const BallPoolCount = 200
    const BallRestitution = 0.9
    const BpmDefault = 60
    const BpmMin = 12
    const BpmMax = 240
    const CollisionRestitution = 1
    const Gravity = 1.5
    const PhysicsBoundsWidth = 1.25 * BoundsWidth
    const PhysicsBoundsHeight = 1.25 * BoundsHeight
    const PhysicsTickInMs = 1000 / 120
    const PlaneCount = 100
    const ToneBaseNote = 33 // 55 hz

    const HalfBoundsWidth = BoundsWidth / 2
    const HalfBoundsHeight = BoundsHeight / 2
    const HalfPhysicsBoundsWidth = PhysicsBoundsWidth / 2
    const HalfPhysicsBoundsHeight = PhysicsBoundsHeight / 2
    const BallRadius = BoundsWidth / 40
    const BallHueIncrement = 360 / BallPoolCount
    const MaxPlaneWidth = Math.sqrt(BoundsWidth * BoundsWidth + BoundsHeight * BoundsHeight)
    const PhysicsTickInSeconds = PhysicsTickInMs / 1000
    const PhysicsTickInSecondsSquared = PhysicsTickInSeconds * PhysicsTickInSeconds
    const PhysicsTickInSecondsSquaredTimesGravity = PhysicsTickInSecondsSquared * Gravity

    const toRadians = (value) => {
        return (value / 180) * Math.PI
    }

    const toDegrees = (value) => {
        return (value / (2 * Math.PI)) * 360
    }

    //#endregion

    //#region Scene setup

    const scene = new BABYLON.Scene(engine)
    scene.enablePhysics(new BABYLON.Vector3(0, -1, 0), new BABYLON.AmmoJSPlugin(false, ammo))

    const camera = new BABYLON.ArcRotateCamera(`camera`, -Math.PI / 2, Math.PI / 2, BoundsWidth * 1.5, BABYLON.Vector3.ZeroReadOnly)
    camera.attachControl()

    const light = new BABYLON.HemisphericLight(`light`, new BABYLON.Vector3(0, 1, 0), scene)
    light.intensity = 0.7

    //#endregion

    let reflectionCount = 1

    const printableAngle = (radians) => {
        const degrees = toDegrees(radians)
        if (degrees < 10) {
           return `  ${degrees.toFixed(3)}`
        }
        if (degrees < 100) {
            return ` ${degrees.toFixed(3)}`
        }
        return `${degrees.toFixed(3)}`
    }

    const createReflection = (velocity, planeAngle) => {
        const velocityLine = BABYLON.MeshBuilder.CreateLines(`velocityLine ${reflectionCount}`, {
            points: [BABYLON.Vector3.ZeroReadOnly, velocity]
        })

        const planeLinePoints = [
            new BABYLON.Vector3(velocity.x - (Math.cos(planeAngle) / 2), velocity.y - (Math.sin(planeAngle) / 2)),
            new BABYLON.Vector3(velocity.x + (Math.cos(planeAngle) / 2), velocity.y + (Math.sin(planeAngle) / 2))
        ]
        const planeLine = BABYLON.MeshBuilder.CreateLines(`planeLine ${reflectionCount}`, {
            points: planeLinePoints,
            colors: [
                new BABYLON.Color3(1, 0.1, 0.1),
                new BABYLON.Color3(1, 0.1, 0.1)
            ]
        })

        let velocityAngle = Math.atan2(velocity.y, velocity.x)
        if (velocityAngle < 0) {
            velocityAngle += Math.PI * 2
        }

        const planeVector = new BABYLON.Vector3(
            planeLinePoints[1].x - planeLinePoints[0].x,
            planeLinePoints[1].y - planeLinePoints[0].y,
            0
        )

        let differenceAngle = planeAngle - velocityAngle
        if (differenceAngle < 0) {
            differenceAngle += Math.PI * 2
        }

        let reflectionAngle = planeAngle + differenceAngle

        console.log(
            `velocityAngle: ${printableAngle(velocityAngle)},    `,
            `planeAngle: ${printableAngle(planeAngle)}    `,
            `out: ${printableAngle(reflectionAngle)}`
        )

        const reflectionLine = BABYLON.MeshBuilder.CreateLines(`reflectionLine ${reflectionCount}`, {
            points: [
                velocity,
                new BABYLON.Vector3(velocity.x + (Math.cos(reflectionAngle) / 2), velocity.y + (Math.sin(reflectionAngle) / 2), -0.1)
            ],
            colors: [
                new BABYLON.Color3(0.1, 1, 0.1),
                new BABYLON.Color3(0.1, 1, 0.1)
            ]
        })
    }

    const iMax = 32
    const iHalfMax = iMax / 2
    const startAngle = 0 //Math.PI / iMax
    for (let i = 0; i < iMax; i++) {
        const angle = startAngle+ i * (Math.PI / iHalfMax)
        createReflection(
            new BABYLON.Vector3(2 * Math.cos(angle), 2 * Math.sin(angle)),
            toRadians(-20)
        )
    }

    return scene
}

function isInBabylonPlayground() {
    return document.getElementById('pg-root') !== null
}

if (!isInBabylonPlayground()) {
    module.exports = createScene
}
