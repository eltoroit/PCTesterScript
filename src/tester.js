import Logs2 from "./logs.js";
import OS2 from "./lowLevelOs.js";
import Colors2 from "./colors.js";
import Bookmarks from "./bookmarks.js";
import ET_Asserts from "./etAsserts.js";

export let skipCompletedTests = true;
export default class Tester {
	config = null;

	constructor({ config }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: config.errors, message: "config.errors" });

		this.config = config;
	}

	async test({ data }) {
		ET_Asserts.hasData({ value: data, message: "data" });

		// // Parallel
		// data.tests.forEach(async (test) => {
		// 	await this.#testItem({ test });
		// });

		// Series
		for (let test of data.tests) {
			try {
				await this.#testItem({ test });
			} catch (ex) {
				// debugger;
			}
		}

		this.#consolidateErrors();
	}

	#consolidateErrors() {
		let consolidator = {
			list: [],
			map: {}
		};

		this.config.errors.forEach((eachError) => {
			if (consolidator.map[eachError.test.Id]) {
				let previousError = consolidator.map[eachError.test.Id];
				previousError.errors.push(eachError.error);
			} else {
				consolidator.list.push(eachError.test.Id);
				eachError.errors = [eachError.error];
				consolidator.map[eachError.test.Id] = eachError;
				delete eachError.error;
			}
		});

		this.config.errors = consolidator.list.map((errorId) => consolidator.map[errorId]);
	}

	async #testItem({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		this.config.currentTest = test;
		Colors2.writeInstruction({ msg: `${test.testName} (${test.Operation__c})` });
		switch (test.Operation__c) {
			case "Bookmark": {
				if (!skipCompletedTests) {
					await this.#testBookmark({ test });
				}
				break;
			}
			case "Execute": {
				if (!skipCompletedTests) {
					await this.#testExecute({ test });
				}
				break;
			}
			case "Check Path": {
				if (!skipCompletedTests) {
					await this.#testCheckPath({ test });
				}
				break;
			}
			case "Clear": {
				Colors2.clearScreen();
				break;
			}
			case "JSON": {
				// debugger;
				break;
			}
			case "Manual": {
				if (!skipCompletedTests) {
					if (this.config.executeManualChecks) {
						await Logs2.promptYesNo({ config: this.config, question: `${test.Command__c} [Y|N]` });
					} else {
						Colors2.error({ msg: "Manual tests are being skipped" });
						Colors2.error({ msg: "Manual tests are being skipped" });
						Colors2.error({ msg: "Manual tests are being skipped" });
					}
				}
				break;
			}
			case "Manual Application": {
				await this.#testManualApplication({ test });
				break;
			}
			case "Write": {
				Colors2.writeMessage({ msg: test.Command__c });
				break;
			}
			default: {
				debugger;
				let msg = "Invalid operation: " + Logs2.getPrettyJson({ obj: test });
				Logs2.reportErrorMessage({ config: this.config, msg });
				throw new Error(msg);
			}
		}
		/*
        Code__c:        '01-01-01-01-#01'
        Command__c:     null
        Expected__c:    null
        Operation__c:   'Clear'
        testName:       'TASK-Level1 | TASK-Level2 | TASK-Level3 | TASK-Level4 | TEST'
        */
	}

	async #testBookmark({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		let bookmarks = new Bookmarks({ config: this.config });
		let bmChecks = JSON.parse(test.Command__c);
		test.Command__c = "Bookmarks";
		await bookmarks.validateBookmarks({ bmChecks });
	}

	async #testExecute({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		try {
			let valid = false;
			Colors2.info({ msg: `EXECUTING: [${test.Command__c}]` });
			const response = await OS2.execute({ config: this.config, command: test.Command__c });
			if (test.Expected__c) {
				if (response.stdout != "" && response.stdout.indexOf(test.Expected__c) >= 0) valid = true;
				if (response.stderr != "" && response.stderr.indexOf(test.Expected__c) >= 0) valid = true;
			} else {
				valid = true;
			}
			if (valid) {
				Colors2.success({ msg: `Response was expected: ${test.Expected__c}` });
			} else {
				Logs2.reportError({
					config: this.config,
					obj: {
						msg: "Response was not expected",
						expected: test.Expected__c,
						response
					}
				});
			}
		} catch (ex) {
			let msg = "Error executing command";
			Logs2.reportException({ config: this.config, msg, ex });
			throw ex;
		}
	}

	async #testCheckPath({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		try {
			let path = test.Command__c;
			Colors2.info({ msg: `Check Path: [${path}]` });
			await OS2.checkPath({ config: this.config, path });
		} catch (ex) {
			let msg = "Error executing command";
			Logs2.reportException({ config: this.config, msg, ex });
			throw ex;
		}
	}

	async #testManualApplication({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		if (this.config.executeManualChecks) {
			await Logs2.promptYesNo({ config: this.config, question: `${test.Command__c} [Y|N]` });
		} else {
			Colors2.writeInstruction({ msg: "Manual tests are being skipped, but I am checking the path!" });
			await this.#testCheckPath({ test });
		}
	}
}

/*
		switch (test.Operation__c) {


			case "Check Contains":
				checkContains(instruction);
				break;
			case "Execute":
				checkContains(instruction);
				break;
			case "Execute Async":
				checkContains(instruction);
				break;
			case "Check Exact":
				checkExact(instruction);
				break;
			case "Check Path":
				checkPath(instruction);
				break;
			
			case "Clear":
				// Clear screen
				log.clearScreen();
				nextInstruction();
				break;
			case "JSON File - Check":
				jsonFile_Check(instruction);
				break;
			case "JSON File - Edit":
				jsonFile_Edit(instruction);
				break;
			case "Manual":
				promptYesNo(instruction);
				break;
			case "Open Application":
				if (executeManualChecks) {
					instruction.callback = function (output) {
						if (output.stderr) {
							instruction.hasErrors = true;
							instruction.returned = output;
							reportError(instruction);
							nextInstruction();
						}
					};
					executeCommand(instruction);
					setTimeout(function () {
						if (!instruction.hasErrors) {
							promptYesNo(instruction);
						}
					}, timerDelay * 10);
				} else {
					let command = instruction.Command__c.replace(/"/g, "");
					let expected = command.substring(command.lastIndexOf("\\") + 1);

					log.error("Manual checks are being skipped for testing! (Open application skipped, but path checked)");
					let newInstruction = { ...instruction };
					newInstruction.Command__c = command;
					newInstruction.Expected__c = expected;
					newInstruction.Operation__c = "Open App >> Check Path";
					newInstruction.AppName__c = `Open/Check Path: ${instruction.AppName__c}`;
					newInstruction.ErrorMessage__c = `${instruction.ErrorMessage__c} (Checking path)`;

					console.log("New instruction -- START");
					log.debug(log.getPrettyJson(newInstruction));
					console.log("New instruction -- END");

					checkPath(newInstruction);
				}
				break;
			case "Write":
				// Force debug mode...
				if (instruction.Command__c == "=== === === AUTOMATED CHECKS === === ===") {
					log.debug("Switching debug mode ON");
					debug = true;
					verbose = true;
					log.setDebug(true);
				}
				log.info(instruction.Command__c);
				nextInstruction();
				break;
			case "Done":
				log.setDebug(false);
				let filePath = new Date().toJSON();
				filePath = filePath.replace(/:/g, "-");
				filePath = `../Errors-${filePath}.json`;
				try {
					fs.unlinkSync(filePath);
				} catch (ex) {
					if (debug) log.debug("Could not delete file " + filePath + ": " + log.getPrettyJson(ex));
				}
				if (errors.length > 0) {
					log.clearScreen();
					log.error("Number Of Errors Found: " + errors.length);
					fs.appendFileSync(filePath, log.getPrettyJson(errors));
					log.error("Errors written to: ./" + filePath);
					log.error("Please put a sticker on this computer");
				} else {
					log.clearScreen();
					log.success("Test complete and no errors found. Thanks for your help ;-)");
					log.success("Please close this and all other windows that were opened during the test");
				}
				process.exit(0);
				break;
			
		}
*/

// OLD_CODE: checkExact(instruction) {
// static checkExact({ config, command }) {
// 	ET_Asserts.hasData({ value: config, message: "config" });

// 	if (config.verbose) Colors2.info({ msg: "CHECKING: [" + command + "]" });
// 	instruction.callback = (output) => {
// 		if (output.stdout === instruction.Expected__c) {
// 			if (verbose) log.success("VALID: [" + output.stdout + "]");
// 			nextInstruction();
// 		} else {
// 			instruction.returned = output;
// 			reportError(instruction);
// 			nextInstruction();
// 		}
// 	};
// 	executeCommand(instruction);
// }
// checkContains(instruction) {
// 	let isExecute = instruction.Operation__c !== "Check Contains";
// 	if (verbose) {
// 		if (isExecute) {
// 			log.info("EXECUTING: [" + instruction.Command__c + "]");
// 		} else {
// 			log.info("CHECKING: [" + instruction.Command__c + "]");
// 		}
// 	}
// 	instruction.callback = (output) => {
// 		var valid = false;

// 		if (isExecute) {
// 			valid = true;
// 		} else {
// 			if (!instruction.Expected__c) valid = true;
// 			if (output.stdout != "" && output.stdout.indexOf(instruction.Expected__c) >= 0) valid = true;
// 			if (output.stderr != "" && output.stderr.indexOf(instruction.Expected__c) >= 0) valid = true;
// 		}

// 		if (valid) {
// 			if (verbose) {
// 				if (instruction.Expected__c) {
// 					log.success("VALID: [" + instruction.Expected__c + "]");
// 				} else {
// 					log.success(`VALID: [${instruction.Command__c}]`);
// 				}
// 			}
// 		} else {
// 			instruction.returned = output;
// 			reportError(instruction);
// 		}
// 		nextInstruction();
// 	};
// 	if (instruction.Operation__c === "Execute Async") {
// 		spawnCommand(instruction);
// 	} else {
// 		executeCommand(instruction);
// 	}
// }
