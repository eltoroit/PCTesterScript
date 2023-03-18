import Colors2 from "./colors.js";
import ETAsserts from "./etAsserts";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { exec } from "child_process"; // execSync, spawn, spawnSync

export default class Logs {
	// OLD_CODE: reportError(instruction) {
	static reportError({ config, obj }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: obj, message: "obj" });

		if (config.debug) Colors2.debug({ msg: "ERROR FOR: " + Colors2.getPrettyJson({ obj }) });
		config.errors.push(obj);
		Colors2.error({ msg: "*** *** ERROR", offset: 1 });
		Colors2.error({ msg: Colors2.getPrettyJson({ obj }), offset: 1 });
	}

	static reportErrorMessage({ config, msg }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: msg, message: "msg" });

		config.errors.push(msg);
		Colors2.error({ msg: Colors2.getPrettyJson({ obj: msg }), offset: 1 });
	}

	// OLD_CODE: promptYesNo(instruction) *** question = instruction.Message__c
	static promptYesNo({ config, question, obj }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: question, message: "question" });
		ETAsserts.hasData({ value: obj, message: "obj" });

		const rl = readline.createInterface({ input, output });

		return new Promise((resolve, reject) => {
			async function loop() {
				const answer = await rl.question(Colors2.getPromptMsg({ msg: "[Y/N] > " }));
				if (answer[0].toUpperCase() === "Y") {
					rl.close();
					resolve("Y");
				} else if (answer[0].toUpperCase() === "N") {
					rl.close();
					this.reportError({ obj });
					resolve("N");
				} else {
					loop();
				}
			}
			Colors2.promptMsg({ msg: question });

			debugger; // Check path for sendkeys.bat
			exec('call sendkeys.bat "C:\\Windows\\System32\\cmd.exe" ""');

			if (config.executeManualChecks) {
				loop();
			} else {
				Colors2.error({ msg: "Manual checks are being skipped for testing! (No prompt)" });
				resolve(null);
			}
		});
	}
}
