/* eslint-disable no-console */
"use strict";

const ETEPL_PauseMilliseconds = require("./ETEPL_PauseMilliseconds");

let config;

module.exports = class ETEPL_ComputerLogin {
	data;
	loginData;

	constructor(_config, loginData) {
		if (!loginData) throw new Error("Missing Parameters");

		// Initialize action
		config = _config;
		this.data = {
			name: "ETEPL_ComputerLogin",
			maxTime: config.timer.pageLoad.value // ET_TIME
		};
		this.loginData = loginData;

		// Report it
		config.logger.logs.addMessage(config.logger.levels.info, "Computer Login", `Accion Added`);
		config.logger.logs.addMessage(config.logger.levels.data, "Computer Login", this.data);
	}

	handleMessage(message) {
		const that = this;

		switch (message.type) {
			case "PageLoad":
				const newUrl = message.newUrl;
				if (newUrl === that.loginData.urlAfter) {
					config.logger.logs.addMessage(config.logger.levels.info, "Computer Login", `Page Loaded: [${newUrl}]`);
					that.updateElectronJson(that.loginData.testStep + 1);
					that.data.readyToRemove = true;
				} else {
					config.logger.logs.addMessage(config.logger.levels.fatal, "Computer Login", `Navigate to an unexpected page. Expected [${that.loginData.urlAfter}], Actual [${newUrl}]`);
				}
				break;
			default:
				config.logger.logs.addMessage(config.logger.levels.fatal, "Computer Login", `Was not expecting this message type: ${message.type}. Expecting: "PageLoad"`);
				break;
		}
	}

	getStatus() {
		return `Login`;
	}

	tick() {
		const that = this;
		that.data.maxTime = config.getMillisecondsFromPattern(config, "Login", that.loginData.timeout);
		that.data.abort = config.etEpl.addMilliseconds(new Date(), that.data.maxTime); // ET_TIME

		config.logger.logs.addMessage(
			config.logger.levels.info,
			"Computer Login",
			`Tick (Aborts @ ${that.data.abort.toLocaleTimeString()} =>  ${config.etEpl.secondsRemaining(that.data.abort)} seconds)`
		);
		config.logger.logs.addMessage(config.logger.levels.data, "Computer Login", that.data);

		switch (that.loginData.testStep) {
			case 0: // Navigate to the login form
				that._navigate(that, config, true);
				break;
			case 1: // Enter the credentials and click submit
				that.performStep_01(that, config);
				break;
			case 2: // Clicks launch button
				that._navigate(that, config);
				break;
			default:
				// Other steps are driven by the user.
				break;
		}
	}

	updateElectronJson(testStep) {
		const electronJson = config.etEpl.readElectronJson();
		electronJson.testStep = testStep;
		config.etEpl.writeElectronJson(electronJson);
		return electronJson;
	}

	performStep_01(that, config) {
		if (config.electron.url === that.loginData.urlBefore) {
			let control = {};
			control.un = that.loginData.un;
			control.pw = that.loginData.pw;
			control.button = that.loginData.button;

			let script = "";
			if (config.debug.openDevTools) {
				script += "debugger;\n";
				config.electron.mainWindow.webContents.openDevTools();
			} 
			
			// setFormFieldsAsync()
			script += `function setFormFieldsAsync() {\n`;
			script += `\treturn new Promise((resolve, reject) => {\n`;
			script += `\t\twindow.setTimeout(() => {\n`;
			script += `\t\t\telInput = document.querySelector("${control.un[0]}");\n`;
			script += '\t\t\telInput.dispatchEvent(new Event("focus", { bubbles: true, composed: true }));\n';
			script += `\t\t\telInput.value = "${control.un[1]}";\n`;
			script += '\t\t\telInput.dispatchEvent(new Event("input", { bubbles: true, composed: true }));\n';
			script += `\t\t\telButton = document.querySelector("${control.button[0]}");\n`;
			script += '\t\t\telButton.dispatchEvent(new Event("focus", { bubbles: true, composed: true }));\n';
			script += `\t\t\telInput = document.querySelector("${control.pw[0]}");\n`;
			script += '\t\t\telInput.dispatchEvent(new Event("focus", { bubbles: true, composed: true }));\n';
			script += `\t\t\telInput.value = "${control.pw[1]}";\n`;
			script += '\t\t\telInput.dispatchEvent(new Event("input", { bubbles: true, composed: true }));\n';
			script += `\t\t\telButton = document.querySelector("${control.button[0]}");\n`;
			script += '\t\t\telButton.dispatchEvent(new Event("focus", { bubbles: true, composed: true }));\n';
			script += `\t\t\tresolve();\n`;
			script += `\t\t}, 500);\n`;
			script += `\t});\n`;
			script += `}\n`;
			script += `\n`;

			// login()
			script += `function login() {\n`;
			script += `\telInput = document.querySelector("${control.un[0]}");\n`;
			script += `\tconsole.log('Valid UN: ' + (elInput.value === "${control.un[1]}"));\n`;
			script += `\telInput = document.querySelector("${control.pw[0]}");\n`;
			script += `\tconsole.log('Valid PW: ' + (elInput.value === "${control.pw[1]}"));\n`;
			script += `\telButton = document.querySelector("${control.button[0]}");\n`;
			script += '\telButton.dispatchEvent(new Event("focus", { bubbles: true, composed: true }));\n';
			script += '\telButton.dispatchEvent(new Event("click", { bubbles: true, composed: true }));\n';
			script += `}\n`;
			script += `\n`;

			// processForm()
			script += `async function processForm() {\n`;
			script += `\tfor (let i = 1; i <= 3; i++) {\n`;
			if (config.debug.openDevTools) {
				script += `\t\tconsole.log("Set form fields #" + i);\n`;
			}
			script += `\t\tawait setFormFieldsAsync();\n`;
			script += `\t}\n`;
			if (config.debug.openDevTools) {
				script += `\tconsole.log("Form has been filled, logging in");\n`;
			}
			script += `\tlogin();\n`;
			script += `}\n`;
			script += `\n`;

			// Main
			script += `window.setInterval(() => {\n`;
			if (config.debug.openDevTools) {
				script += `\tconsole.log("Trying to login again");\n`;
			}
			script += `\tprocessForm();\n`;
			script += "\tdebugger;\n";
			script += `}, ${100 + config.timer.autoClick.value});\n`;
			script += `processForm();\n`;

			// console.log(script);
			config.electron.mainWindow.webContents.executeJavaScript(script);
		} else {
			throw new Error("Not the expected page");
		}
	}

	async _navigate(that, config, startAnywhere) {
		if (startAnywhere || config.electron.url === that.loginData.urlBefore) {
			config.electron.mainHelper
				.loadPage(that.loginData.urlAfter)
				.then(newUrl => {
					if (that.loginData.urlAfter === newUrl) {
						// NOTHING
					} else {
						throw new Error("Page loaded is not the requested");
					}
				})
				.catch(err => {
					config.logger.logs.addMessage(config.logger.levels.error, "Computer Login", `Failed to load page: ${newUrl}`);
					config.electron.mainHelper.handleCriticalError(err);
					config.actions.reset();
				});
		} else {
			config.electron.mainHelper.handleCriticalError(`Not on the expected page [${that.loginData.urlBefore}]`);
			config.actions.reset();
		}
	}
};
