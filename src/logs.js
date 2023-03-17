export default class Logs {
	reportError(instruction) {
		if (debug) log.debug("ERROR FOR: " + log.getPrettyJson(instruction));
		errors.push(instruction);
		log.error("*** *** ERROR", 1);
		log.error(log.getPrettyJson(instruction), 1);
	}
	reportErrorMessage(msg) {
		errors.push(msg);
		log.error(log.getPrettyJson(msg), 1);
	}
	promptYesNo(instruction) {
		log.promptMsg(instruction.Message__c);

		var sendKeysCmd = 'call sendkeys.bat "C:\\Windows\\System32\\cmd.exe" ""';
		// log.debug("Sending keys: " + sendKeysCmd);
		exec(sendKeysCmd);
		const inputReadLine1 = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		if (executeManualChecks) {
			var untilCorrectResponse = () => {
				inputReadLine1.question(log.getPromptMsg("[Y/N] > "), (answer) => {
					if (answer[0].toUpperCase() === "Y") {
						inputReadLine1.close();
						nextInstruction();
					} else if (answer[0].toUpperCase() === "N") {
						inputReadLine1.close();
						instruction.returned = "User responsed 'N'";
						reportError(instruction, true);
						nextInstruction();
					} else {
						untilCorrectResponse();
					}
				});
			};

			untilCorrectResponse();
		} else {
			log.error("Manual checks are being skipped for testing! (No prompt)");
			nextInstruction();
		}
	}
}
