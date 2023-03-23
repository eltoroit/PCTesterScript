import Logs2 from "./logs.js";
import OS2 from "./lowLevelOs.js";
import Colors2 from "./colors.js";
import Bookmarks from "./bookmarks.js";
import ET_Asserts from "./etAsserts.js";
import Colors from "./colors.js";

export default class Tester {
	config = null;

	get skipTestsWhileBuildingApp() {
		let output = true;
		if (output) {
			Colors2.error({ msg: "Tests are being skipped while the applicationis being built" });
		}
		return true;
	}

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
		let promises = [];
		for (let test of data.tests) {
			try {
				await this.#testItem({
					test,
					callback: (promise) => {
						promises.push(promise);
					}
				});
			} catch (ex) {
				// debugger;
			}
		}
		await Promise.allSettled(promises);

		this.#consolidateErrors();
		this.#reportResults({ errors: this.config.errors });
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

	#reportResults({ errors }) {
		ET_Asserts.hasData({ value: errors, message: "errors" });

		if (errors.length === 0) {
			Colors2.clearScreen();
			Colors2.success({ msg: "Test complete and no errors found. Thanks for your help ;-)" });
			Colors2.success({ msg: "Please close this and all other windows that were opened during the test" });
		} else {
			Colors2.clearScreen();
			Colors2.error({ msg: JSON.stringify(errors, null, 4) });
			Colors2.error({ msg: "Number Of Errors Found: " + errors.length });
		}

		if (this.skipTestsWhileBuildingApp) {
			let msg = "I AM DISABLING SOME TESTS WHILE BUILDING THE APP, NOT ALL TESTS WERE EXECUTED !!!";
			for (let i = 0; i < 5; i++) {
				console.log("");
			}
			for (let i = 0; i < 5; i++) {
				Colors2.error({ msg });
			}
			for (let i = 0; i < 5; i++) {
				console.log("");
			}
			// throw new Error(msg);
		}
	}

	async #testItem({ test, callback }) {
		ET_Asserts.hasData({ value: test, message: "test" });
		ET_Asserts.hasData({ value: callback, message: "callback" });

		this.config.currentTest = test;
		if (!["Clear", "Write"].includes(test.Operation__c)) {
			Colors2.writeInstruction({ msg: `${test.testName} (${test.Operation__c})` });
		}
		switch (test.Operation__c) {
			case "Bookmark": {
				if (!this.skipTestsWhileBuildingApp) {
					await this.#testBookmark({ test });
				}
				break;
			}
			case "Execute": {
				if (!this.skipTestsWhileBuildingApp) {
					await this.#testExecute({ test });
				}
				break;
			}
			case "Execute Async": {
				// if (!this.skipTestsWhileBuildingApp) {
				callback(this.#testExecuteAsync({ test }));
				// }
				break;
			}
			case "Check Path": {
				if (!this.skipTestsWhileBuildingApp) {
					await this.#testCheckPath({ test });
				}
				break;
			}
			case "Clear": {
				Colors2.clearScreen();
				await Promise.resolve();
				break;
			}
			case "JSON": {
				// if (!this.skipTestsWhileBuildingApp) {
				await this.#testJSON({ test });
				// }
				break;
			}
			case "Manual": {
				if (!this.skipTestsWhileBuildingApp) {
					await this.#testManual({ test });
				}
				break;
			}
			case "Manual Application": {
				// if (!this.skipTestsWhileBuildingApp) {
				await this.#testManualApplication({ test });
				// }
				break;
			}
			case "Write": {
				Colors2.writeMessage({ msg: test.Command__c });
				await Promise.resolve();
				break;
			}
			default: {
				debugger;
				let msg = "Invalid operation: " + Colors2.getPrettyJson({ obj: test });
				Logs2.reportErrorMessage({ config: this.config, msg });
				throw new Error(msg);
			}
		}
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
			let msg = "Error checking path";
			Logs2.reportException({ config: this.config, msg, ex });
			throw ex;
		}
	}

	async #testManual({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		if (this.config.executeManualChecks) {
			await Logs2.promptYesNo({ config: this.config, question: test.Command__c });
		} else {
			Colors2.error({ msg: "Manual tests are being skipped" });
			Colors2.error({ msg: "Manual tests are being skipped" });
			Colors2.error({ msg: "Manual tests are being skipped" });
		}
	}

	async #testJSON({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		// for (let json of test.jsons) {
		// 	debugger;
		// }
		// Logs2.reportErrorMessage({ config: this.config, msg: "JSON data is not being processed for now" });
		Colors2.error({ msg: "JSON data is not being processed for now" });
	}

	async #testExecuteAsync({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		await this.#executeAsyncHelper({
			test,
			ignoreExecutionErrors: true,
			callback: (response) => {
				debugger;
				Colors2.error({ msg: Colors2.getPrettyJson({ obj: response.msg }) });
			}
		});
	}

	async #testManualApplication({ test }) {
		ET_Asserts.hasData({ value: test, message: "test" });

		await this.#executeAsyncHelper({
			test,
			callback: (response) => {
				Colors2.error({ msg: Colors2.getPrettyJson({ obj: response.msg }) });
				debugger;
			}
		});
		if (this.config.executeManualChecks) {
			try {
				await Logs2.promptYesNo({ config: this.config, question: `Did [${test.AppName__c}] open succesfully?` });
			} catch (ex) {
				let msg = "Unable to ask for verification";
				Logs2.reportException({ config: this.config, msg, ex });
				throw ex;
			}
		} else {
			Colors2.writeInstruction({ msg: "Manual tests are being skipped, but I am opening them anyways!" });
		}
	}

	async #executeAsyncHelper({ test, callback, ignoreExecutionErrors = false }) {
		ET_Asserts.hasData({ value: test, message: "test" });
		ET_Asserts.hasData({ value: callback, message: "callback" });

		let command = {};
		try {
			command = JSON.parse(test.Command__c);
		} catch (ex) {
			let parts = test.Command__c.split("\\");
			let app = parts.pop();
			let cwd = parts.join("\\");
			command = {
				path: test.Command__c,
				app: `"${app}"`,
				args: [],
				cwd
			};
		}

		try {
			if (command.path) {
				await OS2.checkPath({ config: this.config, path: command.path });
			}
		} catch (ex) {
			let msg = "Error checking path";
			Logs2.reportException({ config: this.config, msg, ex });
			throw ex;
		}

		try {
			await OS2.executeAsync({ config: this.config, callback, ...command });
		} catch (ex) {
			if (!ignoreExecutionErrors) {
				let msg = "Error executing app";
				Logs2.reportException({ config: this.config, msg, ex });
				throw ex;
			}
		}
	}
}
