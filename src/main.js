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
		const testType = args.test ? "TEST" : "PROD"; // TEST | PROD

		this.config = null;
		if (testType == "PROD") {
			this.config = {
				debug: false,
				verbose: false,
				checkUrlExists: true,
				executeManualChecks: true
			};
		} else if (testType == "TEST") {
			this.config = {
				debug: true,
				verbose: true,
				checkUrlExists: true,
				executeManualChecks: false
			};
		}
		this.config.errors = [];
		this.config.resultsTofile = true;
		this.config.adminUser = "Administrator";

		// While building :-)
		this.config.debug = true;
		this.config.verbose = true;
	}

	async start() {
		console.log("Hello World");
		let dataReader = new Data({ config: this.config });
		this.data = await dataReader.getData();

		let tester = new Tester({ config: this.config });
		await tester.test({ data: this.data });
		return this.config.errors;
	}
}

async function main() {
	let m = new Main();
	try {
		let errors = await m.start();
		if (errors.length === 0) {
			Colors2.clearScreen();
			Colors2.success({ msg: "Test complete and no errors found. Thanks for your help ;-)" });
			Colors2.success({ msg: "Please close this and all other windows that were opened during the test" });
		} else {
			Colors2.clearScreen();
			Colors2.error({ msg: JSON.stringify(errors, null, 4) });
			Colors2.error({ msg: "Number Of Errors Found: " + errors.length });
		}
	} catch (ex) {
		debugger;
	}
}

main();

// OLD: Writes to a file, and displays final result
// log.setDebug(false);
// let filePath = new Date().toJSON();
// filePath = filePath.replace(/:/g, "-");
// filePath = `../Errors-${filePath}.json`;
// try {
// 	fs.unlinkSync(filePath);
// } catch (ex) {
// 	if (debug) log.debug("Could not delete file " + filePath + ": " + log.getPrettyJson(ex));
// }
// if (errors.length > 0) {
// 	log.clearScreen();
// 	log.error("Number Of Errors Found: " + errors.length);
// 	fs.appendFileSync(filePath, log.getPrettyJson(errors));
// 	log.error("Errors written to: ./" + filePath);
// 	log.error("Please put a sticker on this computer");
// } else {
// 	log.clearScreen();
// 	log.success("Test complete and no errors found. Thanks for your help ;-)");
// 	log.success("Please close this and all other windows that were opened during the test");
// }
// process.exit(0);
