/* eslint-disable no-unused-vars */
// This script was created by Andres Perez to test the image machines.

import Data from "./dataReader.js";
import Tester from "./tester.js";
import minimist from "minimist";
import Colors2 from "./colors.js";

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
		let testType = args.test ? "TEST" : "PROD"; // TEST | PROD
		testType = "PROD";

		this.config = null;
		if (testType == "PROD") {
			this.config = {
				debug: false,
				verbose: false,
				checkUrlExists: true,
				executeManualChecks: false
			};
		} else if (testType == "TEST") {
			this.config = {
				debug: true,
				verbose: true,
				checkUrlExists: true,
				executeManualChecks: true
			};
		}
		this.config.errors = [];
		this.config.resultsTofile = true;
		this.config.adminUser = "Administrator";
	}

	async start() {
		let dataReader = new Data({ config: this.config });
		this.data = await dataReader.getData();

		let tester = new Tester({ config: this.config });
		await tester.test({ data: this.data });
		return this.config.errors;
	}
}

async function main() {
	let m = new Main();
	await m.start();
}

main();
