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
