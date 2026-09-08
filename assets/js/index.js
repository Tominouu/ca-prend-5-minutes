const timerElement = document.getElementById("timer");
const durationInMilliseconds = 5 * 60 * 1000;
const startTime = Date.now();

function updateTimer() {
	const elapsedTime = Date.now() - startTime;
	const remainingTime = Math.max(0, durationInMilliseconds - elapsedTime);
	const minutes = Math.floor(remainingTime / 60000);
	const seconds = Math.floor((remainingTime % 60000) / 1000);
	const milliseconds = remainingTime % 1000;

	timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(3, "0")}`;

	return remainingTime > 0;
}

updateTimer();

const timerInterval = setInterval(() => {
	if (!updateTimer()) {
		clearInterval(timerInterval);
	}
}, 10);

const scratchLayer = document.createElement("canvas");
const scratchContext = scratchLayer.getContext("2d");
const scratchRadius = 72;

scratchLayer.className = "scratch-layer";
document.body.appendChild(scratchLayer);

function resizeScratchLayer() {
	const pixelRatio = window.devicePixelRatio || 1;

	scratchLayer.width = window.innerWidth * pixelRatio;
	scratchLayer.height = window.innerHeight * pixelRatio;
	scratchLayer.style.width = `${window.innerWidth}px`;
	scratchLayer.style.height = `${window.innerHeight}px`;
	scratchContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	scratchContext.globalCompositeOperation = "source-over";
	scratchContext.fillStyle = "rgba(0, 0, 0, 0.97)";
	scratchContext.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function scratchAt(x, y) {
	const light = scratchContext.createRadialGradient(
		x,
		y,
		0,
		x,
		y,
		scratchRadius
	);

	light.addColorStop(0, "rgba(0, 0, 0, 1)");
	light.addColorStop(0.72, "rgba(0, 0, 0, 0.85)");
	light.addColorStop(1, "rgba(0, 0, 0, 0)");

	scratchContext.globalCompositeOperation = "destination-out";
	scratchContext.fillStyle = light;
	scratchContext.beginPath();
	scratchContext.arc(x, y, scratchRadius, 0, Math.PI * 2);
	scratchContext.fill();
}

resizeScratchLayer();
window.addEventListener("resize", resizeScratchLayer);
window.addEventListener("pointermove", (event) => {
	scratchAt(event.clientX, event.clientY);
});
