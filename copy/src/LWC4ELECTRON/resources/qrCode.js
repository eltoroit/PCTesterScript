"use strict";

const myTimer = {
	clock: null
};

function showQRCode(qrData) {
	let check = {
		dttm: new Date().toJSON(),
		uuid: qrData.electronJson.siInfo.uuid
	};
	let jData = { ...qrData };
	jData.check1 = { check: 1, ...check };
	jData.check2 = { check: 2, ...check };
	let sData = JSON.stringify(jData);

	QRCode.toCanvas(document.getElementById("canvasQRCode"), sData, error => {
		if (error) console.error(error);
		console.log("success!");
	});
}

function closeWindowClick() {
	toMain({
		type: "qrCode-CloseWindow",
		callback: message => {
			debugger;
		}
	});
}

toMain({
	type: "qrCode-getData",
	callback: message => {
		let counter = -1;
		showQRCode(message.data.qrData);

		if (myTimer.clock) clearInterval(myTimer.clock);
		myTimer.formTimeout = message.data.formTimeout;
		myTimer.expires = addMilliseconds(new Date(), message.data.formTimeout);
		myTimer.clock = setInterval(() => {
			// counter--;
			// if (counter < 0) {
			// 	counter = 4 * 1;
			showQRCode(message.data.qrData);
			// }
			myTimer.secondsRemaining = secondsRemaining(myTimer.expires);
			if (myTimer.secondsRemaining <= 0) myTimer.secondsRemaining = 0;
			const minutes = Math.floor(myTimer.secondsRemaining / 60);
			const seconds = `${Math.floor(myTimer.secondsRemaining - minutes * 60)}`;
			document.getElementById("Expires").innerHTML = `${minutes} : ${seconds.padStart(2, "0")}`;
		}, 250);
	}
});
