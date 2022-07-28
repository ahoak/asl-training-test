import { createNanoEvents } from 'nanoevents'

export class VideoDataSourceBase {
	#fps = 15
	#started = false
	#lastRun = Date.now()
	
	/**
	 * @type {HTMLVideoElement | null}
	 */
	#videoEle = null
	#loopTimeout = null
	#emitter = null
	#paused = false
	#idx = 0
	#sign= null // : string | null

	/**
	 * @type {string | MediaStream | MediaSource | Blob | File | null}
	 */
	#sources = null

	#source = null

	constructor(fps) {
		this.#emitter = createNanoEvents()
		this.#fps = fps
		this.#videoEle = document.createElement('video')
		this.#videoEle.addEventListener('ended', (event) => this.onVideoComplete())
	}

	get width() {
		return this.#videoEle.videoWidth
	}
	
	get height() {
		return this.#videoEle.videoHeight
	}

	async pause() {
		this.#paused = true
		// if (this.#started) {
		// 	await this.#videoEle.pause()
		// }
	}

	async resume() {
		this.#paused = false
		// if (this.#started) {
		// 	await this.#videoEle.play()
		// }
	}

	async start() {
		if (!this.#started) {
			this.#started = true
			this.#paused = false
			const [sources, sign, idx ] = await this.fetchVideoSourceInternal()
			this.#sources = sources
			this.#sign = sign
			this.#idx = idx
			await this.#sources.map(async (source)=>{
				this.#source = source
				await this.#loadVideoElement(source)
				this.#imageLoop()
				this.#emitter.emit('start')
			})
			
		}
	}

	stop() {
		if (this.#loopTimeout) {
			clearTimeout(this.#loopTimeout)
			this.#loopTimeout = null
		}
		this.#started = false
		this.#cleanVideoElement()
	
		this.#emitter.emit('stop')
	}

	on(event, callback) {
		return this.#emitter.on(event, callback)
	}

	/**
	 * @returns {Promise<string | MediaStream | MediaSource | Blob | File | null> }
	 */
	async fetchVideoSourceInternal() {
		throw new Error("Subclasses should implement fetchVideoSourceInternal")
	}

	/**
	 * event that occurs when the video is done
	 */
	async onVideoComplete() {}

	/**
	 * refreshes the video source
	 */
	async reloadVideoSource() {
		this.#sources = await this.fetchVideoSourceInternal()
		this.#sources.map(async (source)=>{
			await this.#loadVideoElement(source)
		})
	}

	/**
	 * The image processing loop
	 */
	#imageLoop = async () => {
		this.#loopTimeout = null
		if (this.#source && this.#started) {
			if (!this.#paused) {
				this.#emitter.emit('frameReady', this.#videoEle, this.width, this.height, this.#sign, this.#idx)
			}

			// Try to target the given FPS
			const diff = this.#lastRun - Date.now;
			this.#loopTimeout = setTimeout(this.#imageLoop, Math.max((this.#fps / 1000) - diff, 0))
		}
	}

	/**
	 * 
	 * @param {*} source 
	 */
	async #loadVideoElement(source) {
		if (source) {
			if (typeof source === "string") {
				this.#videoEle.src = source
			} else {
				this.#videoEle.srcObject = source
			}
			await this.#videoEle.play()
		} else {
			if (this.#started) {
				this.#emitter.emit('complete')
				this.stop()
			}
			this.#cleanVideoElement()
		}
	}

	async #cleanVideoElement() {
		this.#videoEle.srcObject = null
		this.#videoEle.src = null
		this.#videoEle.pause()
	}
}