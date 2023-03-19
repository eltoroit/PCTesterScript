/* eslint-disable no-unused-vars */
// This script was created by Andres Perez to test the image machines.

import minimist from "minimist";
import Colors2 from "./colors.js";

// Configure execution...
const timerDelay = 250;

class Tester {
	errors = [];
	config = null;
	// errorCodes = {};
	// instructions = [];
	// idxInstructions = 0;

	constructor() {
		this.initializeConfig();
	}

	initializeConfig() {
		let args = minimist(process.argv.slice(2), {
			alias: {
				t: "test",
				r: "run"
			}
		});
		const testType = args.test ? "TEST" : "PROD"; // TEST | PROD

		this.config = null;
		if (testType == "PROD") {
			this.config = {
				debug: false,
				verbose: false,
				resultsTofile: true,
				checkUrlExists: true,
				executeManualChecks: true
			};
		} else if (testType == "TEST") {
			this.config = {
				debug: true,
				verbose: true,
				resultsTofile: true,
				checkUrlExists: true,
				executeManualChecks: false
			};
		}
		this.config.errors = [];
		this.config.adminUser = "Administrator";
	}

	start() {
		Colors2.error({ msg: "Hello World" });
	}
}

let t = new Tester();
t.start();
