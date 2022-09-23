import * as BABYLON from 'babylonjs'

const createScene = require('./playground.js')
// const createScene = require('./reflections.js')

global.canvas = document.getElementsByTagName('canvas')[0]
global.engine = new BABYLON.Engine(canvas, true, { audioEngine: true, audioEngineOptions: {
    audioContext: new AudioContext
}})

const scene = createScene()

engine.runRenderLoop(() => {
    scene.render();
})

onresize = () => {
    engine.resize()
}
