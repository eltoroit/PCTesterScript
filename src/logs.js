import * as readline from "node:readline/promises";
import Colors from "./colors.js";

export default class Logs {
	errors = [];
	debug = false;
	executeManualChecks = false;

	constructor({ debug, errors, executeManualChecks }) {
		this.debug = debug;
		this.errors = errors;
		this.executeManualChecks = executeManualChecks;
	}
	reportError({ instruction }) {
		if (this.debug) Colors.debug("ERROR FOR: " + Colors.getPrettyJson(instruction));
		this.errors.push(instruction);
		Colors.error("*** *** ERROR", 1);
		Colors.error(Colors.getPrettyJson(instruction), 1);
	}
	reportErrorMessage({ msg }) {
		this.errors.push(msg);
		Colors.error(Colors.getPrettyJson(msg), 1);
	}
	promptYesNo({ instruction }) {
		Colors.promptMsg(instruction.Message__c);

		var sendKeysCmd = 'call sendkeys.bat "C:\\Windows\\System32\\cmd.exe" ""';
		// Colors.debug("Sending keys: " + sendKeysCmd);
		exec(sendKeysCmd);
		const inputReadLine1 = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		if (this.executeManualChecks) {
			var untilCorrectResponse = () => {
				inputReadLine1.question(Colors.getPromptMsg("[Y/N] > "), (answer) => {
					if (answer[0].toUpperCase() === "Y") {
						inputReadLine1.close();
						nextInstruction();
					} else if (answer[0].toUpperCase() === "N") {
						inputReadLine1.close();
						instruction.returned = "User responsed 'N'";
						this.reportError(instruction, true);
						nextInstruction();
					} else {
						untilCorrectResponse();
					}
				});
			};

			untilCorrectResponse();
		} else {
			Colors.error("Manual checks are being skipped for testing! (No prompt)");
			nextInstruction();
		}
	}
}
