import Logs2 from "./logs.js";
import Colors2 from "./colors.js";
import ETAsserts from "./etAsserts";
import * as fs from "node:fs/promises";
import { exec, execSync, spawn, spawnSync } from "child_process";

export default class LowLevelOS {
	static doesFileExist({ config, path }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: path, message: "path" });

		return new Promise((resolve, reject) => {
			fs.stat(path)
				.then((stat) => {
					resolve(stat.size > 0);
				})
				.catch((err) => reject(err));
		});
	}

	static readFile({ config, path, isCreate = false }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: path, message: "path" });

		return new Promise((resolve, reject) => {
			(async () => {
				try {
					if (config.verbose) Colors2.debug({ msg: "Reading file: " + path });
					const fileExists = await LowLevelOS.doesFileExist({ path });
					if (fileExists) {
						resolve(await fs.readFile(path, "utf8"));
					} else {
						let err = "Files does not exist: " + path;
						Logs2.reportErrorMessage({ config, msg: err });
						if (isCreate) {
							await LowLevelOS.writeFile(path, "{}");
						}
						reject(err);
					}
				} catch (ex) {
					reject(ex);
				}
			})();
		});
	}

	static async writeFile({ config, path, data }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: path, message: "path" });
		ETAsserts.hasData({ value: data, message: "data" });

		try {
			await fs.writeFile(path, data);
		} catch (ex) {
			Logs2.reportErrorMessage({ config, msg: "Error creating file: " + path });
		}
	}

	// OLD_CODE: static async spawnCommand(instruction) {
	// REMOVED... Use executeCommand
	//  OLD_CODE: executeCommand(instruction) {
	static commandExecute({ config, command }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: command, message: "command" });

		return new Promise((resolve, reject) => {
			if (config.debug) Colors2.debug({ msg: "EXECUTING: " + command });

			let output = {
				cmd: command,
				stdout: null,
				stderr: null
			};
			exec(command, (error, stdout, stderr) => {
				output.stdout = stdout ? stdout.trim() : "";
				output.stderr = stderr ? stderr.trim() : "";
				output.error = error ? error.message.trim() : "";
				if (config.debug) Colors2.debug({ msg: "OUTPUT: " + Colors2.getPrettyJson({ obj: output }) });
				if (error) {
					reject(output);
				} else {
					resolve(output);
				}
			});
		});
	}

	// checkPath(instruction) {
	static commandCheckPath({ config, path }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: path, message: "path" });

		return new Promise((resolve, reject) => {
			if (config.verbose) Colors2.info({ msg: "CHECK PATH: [" + path + "]" });
			let command = `DIR "${path}" /B`;

			LowLevelOS.commandExecute({ config, command })
				.then((output) => {
					let expected = command.split("\\").pop();
					if (expected.endsWith("*")) {
						// Remove last character, if it's a wildcard asterisk.
						expected = expected.replace(/.$/, "");
					}
					if (output.stdout.toLowerCase().indexOf(expected.toLowerCase()) >= 0) {
						if (config.verbose) Colors2.success({ msg: "VALID: [Found: '" + expected + "']" });
						resolve();
					} else {
						let err = output;
						Logs2.reportErrorMessage({ config, msg: err });
						reject(err);
					}
				})
				.catch((error) => {
					reject(error);
				});
		});
	}
	// OLD_CODE: checkExact(instruction) {
	// static checkExact({ config, command }) {
	// 	ETAsserts.hasData({ value: config, message: "config" });

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
}
