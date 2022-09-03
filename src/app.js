import * as BABYLON from 'babylonjs'
import * as CANNON from 'cannon'

const createScene = require('./playground.js')

global.canvas = document.getElementsByTagName('canvas')[0]
global.engine = new BABYLON.Engine(canvas, true)

const scene = createScene()

engine.runRenderLoop(() => {
    scene.render();
})

onresize = () => {
    engine.resize()
}