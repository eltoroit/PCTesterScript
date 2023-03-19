
function nextInstruction() {
	setTimeout(executeInstruction, timerDelay);
}
function executeInstruction() {
	if (idxInstructions >= instructions.length) return;
	let instruction = instructions[idxInstructions++];

	// Check AppName__c
	switch (instruction.Operation__c) {
		case "Clear":
		case "Write":
			break;
		default:
			log.info(">>> Instruction #" + idxInstructions + ": " + instruction.Name + " | " + instruction.AppName__c + " | " + instruction.Operation__c);
			if (debug) log.debug(log.getPrettyJson(instruction));

			// Check every record has an AppName__c
			if (!instruction.AppName__c) {
				let msg = "Instruction #" + idxInstructions + ". Does not have a valid AppName__c. " + log.getPrettyJson(instruction);
				reportErrorMessage(msg);
				throw msg;
			}

			// Check unique record AppName__c
			instruction.AppName__c = instruction.AppName__c.toUpperCase();
			// if (errorCodes[instruction.AppName__c]) {
			// 	let msg =
			// 		"Instruction #" +
			// 		idxInstructions +
			// 		". You can not reuse AppName__c. " +
			// 		log.getPrettyJson(instruction);
			// 	reportErrorMessage(msg);
			// 	throw new Error(msg);
			// }
			errorCodes[instruction.AppName__c] = instruction;
	}

	switch (instruction.Operation__c) {
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
		case "Bookmark":
			validateBookmarks(instruction);
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
		default:
			log.error("Invalid operation: " + log.getPrettyJson(instruction));
			stopAndFix = true;
	}
}
function menuChooseEvent(data) {
	const runAutomated = (event) => {
		debug = true;
		verbose = true;
		resultsTofile = true;
		checkUrlExists = true;
		executeManualChecks = false;

		instructions = data.actionsByEvent[event.Id];
		instructions.push({
			AppName__c: "Done",
			Operation__c: "Done",
			Name: "Done"
		});
		idxInstructions = 0;
		executeInstruction();
	};

	let events = data.events;

	log.setDebug(debug);
	log.info("Application Tester built by Andres Perez (ELTORO.IT) to help validate the computer's setup");
	log.info("");
	log.info("Please select the test you want to run");
	for (let i = 1; i <= events.length; i++) {
		log.info(i + ". " + events[i - 1].Name);
	}
	log.info(0 + ". Exit without testing");
	log.info(99 + ". Run automated tests");

	if (args.run) {
		runAutomated(events[args.run - 1]);
	} else {
		const inputReadLine2 = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		let forEver = function () {
			inputReadLine2.question(log.getPromptMsg("Please select a number [0 - " + events.length + "] > "), function (answer) {
				if (answer == 0) {
					process.exit(0);
				} else if (answer == 99) {
					runAutomated(events[0]);
				} else if (answer >= 1 && answer <= events.length) {
					inputReadLine2.close();
					let event = events[answer - 1];
					instructions = data.actionsByEvent[event.Id];
					instructions.push({
						AppName__c: "Done",
						Operation__c: "Done",
						Name: "Done"
					});
					idxInstructions = 0;
					executeInstruction();
				} else {
					forEver();
				}
			});
		};

		forEver();
	}
}
function bookmarksChecks() {
	if (doesFileExist(bmPretendPath)) {
		log.error("BOOKMARKS ARE NOT PROCESSED FROM THE BROWSERS!!!");
		log.error("Bookmarks are procesed from file [" + bmPretendPath + "]");
		log.error("Delete the file is this is a real test!");
	}
	if (doesFileExist(bmCheckPath)) {
		let bmChecks = loadFileJson(bmCheckPath);
		if (!(bmChecks.length > 0)) {
			log.error("BOOKMARKS CAN NOT PROCESSED!!!");
			let msg = "Invalid bookmarks checker configuration file [" + bmCheckPath + "]!";
			log.error(msg);
			throw new Error(msg);
		}
	} else {
		log.error("BOOKMARKS CAN NOT PROCESSED!!!");
		let msg = "Bookmarks checker configuration file [" + bmCheckPath + "] does not exist!";
		log.error(msg);
		throw new Error(msg);
	}
}

const data = loadFileJson("./data.json");
log.promptMsg(`Version: ${data.now}`);
bookmarksChecks();
menuChooseEvent(data);
