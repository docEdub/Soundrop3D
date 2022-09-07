import Ammo from 'ammo.js'
import * as BABYLON from 'babylonjs'

const createScene = require('./playground.js')

global.canvas = document.getElementsByTagName('canvas')[0]
global.engine = new BABYLON.Engine(canvas, true)

const ammo = Ammo()
global.ammo = ammo

const scene = createScene()

engine.runRenderLoop(() => {
    scene.render();
})

onresize = () => {
    engine.resize()
}