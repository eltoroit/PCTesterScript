/* eslint-disable no-unused-vars */
// This script was created by Andres Perez to test the image machines.

import Data from "./data.js";
import Tester from "./tester.js";
import minimist from "minimist";

// Configure execution...
const timerDelay = 250;

class Main {
	data = null;
	config = null;

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

	async start() {
		console.log("Hello World");
		let dataReader = new Data({ config: this.config });
		this.data = await dataReader.getData();

		let tester = new Tester({ config: this.config });
		tester.test({ data: this.data });
		debugger;
	}
}

let m = new Main();
m.start();
