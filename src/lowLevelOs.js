import Logs2 from "./logs.js";
import Colors2 from "./colors.js";
import ET_Asserts from "./ET_Asserts";
import { exec } from "child_process";
import * as fs from "node:fs/promises";
import * as readline from "node:readline/promises";

export default class LowLevelOS {
	static async doesFileExist({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		const stat = await fs.stat(path);
		return stat.size > 0;
	}

	static async readFile({ config, path, isCreate = false }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		if (config.verbose) Colors2.debug({ msg: "Reading file: " + path });
		const fileExists = await LowLevelOS.doesFileExist({ path });
		if (fileExists) {
			const fileContents = await fs.readFile(path, "utf8");
			return fileContents;
		} else {
			let err = "Files does not exist: " + path;
			Logs2.reportErrorMessage({ config, msg: err });
			if (isCreate) {
				await LowLevelOS.writeFile(path, "{}");
			}
			throw new Error(err);
		}
	}

	static async writeFile({ config, path, data }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });
		ET_Asserts.hasData({ value: data, message: "data" });

		if (config.verbose) Colors2.debug({ msg: Colors2.getPrettyJson({ obj: { msg: "Writing file: " + path, data } }) });
		try {
			await fs.writeFile(path, data);
		} catch (ex) {
			Logs2.reportErrorMessage({ config, msg: "Error creating file: " + path });
		}
	}

	static async readLines({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		return new Promise((resolve, reject) => {
			if (config.debug) Colors2.debug({ msg: `Reading lines from [${path}]` });

			const lines = [];
			const lineReader = readline.createInterface({ input: fs.createReadStream(path) });
			lineReader.on("line", (line) => lines.push(line));
			lineReader.on("close", resolve(lines));
		});
	}

	static async fsReadDir({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		if (config.debug) Colors2.debug({ msg: "Finding files in: " + path });
		return fs.readdirSync(path);
	}

	static async fsExists({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		if (config.debug) Colors2.debug({ msg: "Validating full path: " + path });
		return fs.existsSync(path);
	}

	static async fsAppendFile({ config, path, data }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });
		ET_Asserts.hasData({ value: data, message: "data" });

		if (config.debug) Colors2.debug({ msg: `Appending [${data}] to [${path}]` });
		return fs.appendFileSync(path, data);
	}

	// OLD_CODE: static async spawnCommand(instruction) {
	// REMOVED... Use execute
	//  OLD_CODE: executeCommand(instruction) {
	static async execute({ config, command }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: command, message: "command" });

		// Can't do async/await because it has a callback function
		return new Promise((resolve, reject) => {
			if (config.debug) Colors2.debug({ msg: "EXECUTING: " + command });

			let output = {
				cmd: command,
				error: null,
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
	static async checkPath({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		if (config.verbose) Colors2.info({ msg: "CHECK PATH: [" + path + "]" });
		let command = `DIR "${path}" /B`;
		let expected = command.split("\\").pop();
		if (expected.endsWith("*")) {
			// Remove last character, if it's a wildcard asterisk.
			expected = expected.replace(/.$/, "");
		}
		let output = await LowLevelOS.commandExecute({ config, command });
		if (output.stdout.toLowerCase().indexOf(expected.toLowerCase()) >= 0) {
			if (config.verbose) Colors2.success({ msg: "VALID: [Found: '" + expected + "']" });
			return;
		} else {
			let err = output;
			Logs2.reportErrorMessage({ config, msg: err });
			throw new Error(err);
		}
	}
}
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
