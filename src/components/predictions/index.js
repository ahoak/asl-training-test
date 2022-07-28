import templateContent from "./predictions.html";
import { WebcamDataSource } from "./../../datasources/webcam.js";
import { mirrorImage } from "./../../imageUtils.js";
import { HandPoseModel } from "./../../models/handPose.js";


export class Predictions extends HTMLElement {
  #root = null;
  #startStopButton = null;
  #predictions = null;
  #model = null;

  #CV_CANVAS = null;
  #cvCtx = null;

  #canvas = null;
  #ctx = null;

  #tfCanvas = null;
  #tfCanvasCtx = null;

  #videoInputDisplay = null;
  #inputCtx = null;

  /**
   * @type {WebcamDataSource | null}
   */
  #imageSource = null;

  #loadedPromise = null;

  constructor(tfModel = null) {
    super();

    this.#initElement(false, tfModel);
  }

  #updateOutput(output) {
    this.#predictions.innerHTML = output;
  }

  /**
   * Initializes this element
   */
  #initElement(shadow = false, tfModel) {
    if (shadow) {
      this.attachShadow({ mode: "open" }); // sets and returns 'this.shadowRoot'
      this.#root = this.shadowRoot;
    } else {
      this.#root = this;
    }

    this.#root.innerHTML = templateContent;

    this.#predictions = this.#root.querySelector(".predictions");

    this.#startStopButton = this.#root.querySelector("#startStopBtn");

    this.#CV_CANVAS = document.createElement("canvas");
    this.#cvCtx = this.#CV_CANVAS.getContext("2d");

    this.#canvas = this.#root.querySelector("#c_img");
    this.#ctx = this.#canvas.getContext("2d");

    this.#tfCanvas = document.createElement("canvas");
    this.#tfCanvasCtx = this.#tfCanvas.getContext("2d");

    this.#videoInputDisplay = this.#root.querySelector("#videoInputDisplay");
    this.#inputCtx = this.#videoInputDisplay.getContext("2d");

    this.#startStopButton.addEventListener("click", this.#toggleVideo);
    this.#imageSource = this.#createImageSource();

    this.#model = new HandPoseModel();
    this.#loadedPromise = this.#model.load(tfModel);
  }

  async #processImage(img, width = 200, height = 200) {
    if (width > 0 && height > 0) {
      // Scale our canvas to match the incoming image dimensions
      this.#cvCtx.canvas.width = width;
      this.#cvCtx.canvas.height = height;
      this.#tfCanvasCtx.canvas.width = width;
      this.#tfCanvasCtx.canvas.height = height;

      this.#cvCtx.clearRect(0, 0, width, height);
      this.#cvCtx.drawImage(img, 0, 0);

      await mirrorImage(this.#cvCtx, this.#tfCanvasCtx);
    }
  }

  async #stop() {
    await this.#stopVideo();
  }

  async #start() {
    await this.#loadedPromise;
    await this.#stopVideo();
    await this.#startVideo();
  }

  /**
   * Enable the webcam with video constraints applied.
  **/
  async #startVideo() {
    console.log("starting data source");

    this.#startStopButton.innerText = "Stop";
    if (this.#imageSource) {
      await this.#imageSource.start();
    }
  }

  async #stopVideo() {
    console.log("stopping data source");
    if (this.#imageSource) {
      await this.#imageSource.stop();
    }
    this.#startStopButton.innerText = "Start";
  }

  /**
   * Creates an image source and callback for predictions
   */
  #createImageSource() {
    // Default to webcam
    const source = new WebcamDataSource(30);
    source.on("frameReady", async (imageData, width, height, sign, index) => {
      await this.#imageSource.pause();
      this.#inputCtx.canvas.width = width;
      this.#inputCtx.canvas.height = height;
      this.#inputCtx.drawImage(imageData, 0, 0);
      await this.#processImage(imageData, width, height);
      const result = await this.#model.predict(this.#tfCanvas, this.#ctx);
      const prediction = result ? `${result}` : "No predictions";
      this.#updateOutput(prediction);
      await this.#imageSource.resume();
    });
    return source;
  }

  #toggleVideo = async () => {
    // Little jank
    const isStarted = this.#startStopButton.innerText == "Stop";
    if (isStarted) {
      await this.#stop();
    } else {
      await this.#start();
    }
  };
}
customElements.define("predictions-display", Predictions);
