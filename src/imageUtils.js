/**
 * 
 * @param {*} sourceCanvas 
 * @param {*} targetCanvas 
 */
export async function mirrorImage(sourceCanvas, targetCanvas) {
	
	// move to x + img's width
	targetCanvas.translate(sourceCanvas.canvas.width, 0);

	// scaleX by -1; this "trick" flips horizontally
	targetCanvas.scale(-1, 1);

	// draw the img
	// no need for x,y since we've already translated
	targetCanvas.drawImage(sourceCanvas.canvas, 0, 0);

	// always clean up -- reset transformations to default
	targetCanvas.setTransform(1, 0, 0, 1, 0, 0);
	
}