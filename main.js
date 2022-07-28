import { Predictions } from "./src/components/predictions"
import { train } from './src/train'
import './style.css'

const mainEle = document.getElementById("main");
mainEle.innerHTML = "Initializing Training...";

async function load() {	
	const model = await train(mainEle, {
		epochs: 5
	})
	mainEle.innerHTML = ""
	mainEle.appendChild(new Predictions(model))
}
load()
