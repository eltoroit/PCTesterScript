let counter = 0;
function delay() {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			console.log(++counter);
			resolve(counter);
		}, 1000);
	});
}

async function waitUntilTrue() {
	return new Promise((resolve, reject) => {
		async function loop() {
			let data = await delay();
			if (data < 5) {
				loop();
			} else {
				resolve(data);
			}
		}
		loop();
	});
}

console.log("START");
waitUntilTrue().then((data) => {
	console.log(`Became true: ${data}`);
});
