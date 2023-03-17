import * as readline from "node:readline/promises";
import url from "url";
import http from "http";
import https from "https";
import path from "path";
import minimist from "minimist";
// import Colors from "./colors.js";

// Configure execution...
const timerDelay = 250;

class Tester {
	args = null;
	errors = [];
	debug = false;
	errorCodes = {};
	verbose = false;
	instructions = [];
	idxInstructions = 0;
	resultsTofile = true;
	checkUrlExists = true;
	executeManualChecks = true;

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
			this.debug = false;
			this.verbose = false;
			this.resultsTofile = true;
			this.checkUrlExists = true;
			this.executeManualChecks = true;
		} else if (testType == "TEST") {
			this.debug = true;
			this.verbose = true;
			this.resultsTofile = true;
			this.checkUrlExists = true;
			this.executeManualChecks = false;
		}
	}

	start() {
		colorLogs.error("Hello World");
	}
}

let t = new Tester();
t.start();
