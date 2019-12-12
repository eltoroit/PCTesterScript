/* eslint-disable no-console */
"use strict";

let config;

module.exports = class ETEPL_QRCode {
	data;
	qrData;

	constructor(_config, qrData) {
		if (!qrData) throw new Error("Missing Parameters");

		config = _config;
		this.data = {
			name: "ETEPL_QRCode",
			maxTime: Math.max(config.timer.callout.value, config.timer.pageLoad.value) // ET_TIME
		};
		this.qrData = qrData;
		config.logger.logs.addMessage(config.logger.levels.info, "QRCode", `Accion Added`);
		config.logger.logs.addMessage(config.logger.levels.data, "QRCode", this.data);
	}

	handleMessage(message) {
		switch (message.type) {
			case "qrCode-getData":
				const formTimeout = config.timer.user.value; // ET_TIME
				this.data.abort = config.etEpl.addMilliseconds(new Date(), formTimeout);

				// Return by reference
				message.data = {
					formTimeout,
					qrData: this.qrData
				};
				break;
			case "qrCode-CloseWindow":
				config.electron.mainHelper.showHideWindow(false);
				that.data.readyToRemove = true;
				break;
			default:
				break;
		}
	}

	getStatus() {
		// Important for dispaying n the cosole the status of the app.
		return `QRCode`;
	}

	tick() {
		config.logger.logs.addMessage(config.logger.levels.info, "QRCode", "Tick");
		config.logger.logs.addMessage(config.logger.levels.data, "QRCode", this.data);

		// Load QR Code page
		config.logger.logs.addMessage(config.logger.levels.info, "QRCode", `Opening the QRCode Page`);
		config.electron.mainHelper
			.loadPage(config.local.qrCode)
			.then(newUrl => {
				config.logger.logs.addMessage(config.logger.levels.info, "QRCode", `Page Loaded: [${newUrl}]`);
			})
			.catch(err => {
				config.logger.logs.addMessage(config.logger.levels.error, "QRCode", `Failed to load page: ${config.local.qrCode}`);
				config.electron.mainHelper.handleCriticalError(err);
				config.actions.reset();
			});
	}

	abort() {
		config.electron.mainHelper.showHideWindow(false);
		this.data.readyToRemove = true;
	}
};
