import Logs2 from "./logs.js";
import Colors2 from "./colors.js";
import Bookmarks from "./bookmarks.js";
import ET_Asserts from "./etAsserts.js";

export default class Tester {
	config = null;

	constructor({ config }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: config.errors, message: "config.errors" });

		this.config = config;
	}

	async test({ data }) {
		ET_Asserts.hasData({ value: data, message: "data" });

		debugger;

		// // Parallel
		// data.tests.forEach(async (test) => {
		// 	await this.#testItem({ test });
		// });

		// Series
		for (let test of data.tests) {
			await this.#testItem({ test });
		}
	}

	async #testItem({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		this.config.currentTest = test;
		Colors2.info({ msg: `${test.testName} (${test.Operation__c})` });
		switch (test.Operation__c) {
			case "Bookmark": {
				await this.#testBookmarks({ test });
				break;
			}
			case "Execute": {
				// debugger;
				break;
			}
			case "Check Path": {
				// debugger;
				break;
			}
			case "Clear": {
				// debugger;
				break;
			}
			case "JSON": {
				// debugger;
				break;
			}
			case "Manual": {
				// debugger;
				break;
			}
			case "Manual Application": {
				// debugger;
				break;
			}
			case "Write": {
				// debugger;
				break;
			}
			default: {
				debugger;
				let msg = "Invalid operation: " + Logs2.getPrettyJson({ obj: test });
				Logs2.error({ msg });
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

	async #testBookmarks({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		let bookmarks = new Bookmarks({ config: this.config });
		let bmChecks = JSON.parse(test.Command__c);
		test.Command__c = "Bookmarks";
		await bookmarks.validateBookmarks({ bmChecks });
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
