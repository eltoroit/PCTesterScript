/* eslint-disable no-unused-vars */

import url from "url";
import http from "http";
import https from "https";
import path from "path";
import minimist from "minimist";
import Colors from "./colors.js";

// Configure execution...
const timerDelay = 250;

class Tester {
	config = {
		debug: false,
		verbose: false,
		resultsTofile: true,
		checkUrlExists: true,
		executeManualChecks: true
	};
	args = null;
	errors = [];
	errorCodes = {};
	instructions = [];
	idxInstructions = 0;

	constructor() {
		// initialize app
		this.args = minimist(process.argv.slice(2), {
			alias: {
				t: "test",
				r: "run"
			}
		});
		const testType = this.args.test ? "TEST" : "PROD"; // TEST | PROD
		if (testType == "PROD") {
			this.config.debug = false;
			this.config.verbose = false;
			this.config.resultsTofile = true;
			this.config.checkUrlExists = true;
			this.config.executeManualChecks = true;
		} else if (testType == "TEST") {
			this.config.debug = true;
			this.config.verbose = true;
			this.config.resultsTofile = true;
			this.config.checkUrlExists = true;
			this.config.executeManualChecks = false;
		}
	}

	start() {
		Colors.error("Hello World");
	}
}

let t = new Tester();
t.start();
