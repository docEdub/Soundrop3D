import * as Ammo from 'ammo.js'
import * as BABYLON from 'babylonjs'

const createScene = require('./playground.js')

global.canvas = document.getElementsByTagName('canvas')[0]
global.engine = new BABYLON.Engine(canvas, true, { audioEngine: true, audioEngineOptions: {
    audioContext: new AudioContext
}})

new Ammo().then((ammo) => {
    global.ammo = ammo

    const scene = createScene()

    engine.runRenderLoop(() => {
        scene.render();
    })

    onresize = () => {
        engine.resize()
    }
})
