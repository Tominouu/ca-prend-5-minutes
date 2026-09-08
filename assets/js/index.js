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
