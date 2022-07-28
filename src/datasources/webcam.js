import { VideoDataSourceBase } from './videoBase'

export class WebcamDataSource extends VideoDataSourceBase {
	#stream = null

	stop() {
		super.stop()

		if (this.#stream) {
			this.#stream.getTracks().forEach(t => t.stop())
			this.#stream = null
		}
	}

	async fetchVideoSourceInternal() {
		if (!this.#stream) {
			const constraints = {
				video: true,
				width: 200,
				height: 200,
			};
			this.#stream = await navigator.mediaDevices.getUserMedia(constraints);
		}
		/* output [ paths[] , sign , idx]*/
		return [ [this.#stream] ]
	}
}