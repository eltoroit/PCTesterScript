import * as fs from "node:fs/promises";
import { exec, execSync, spawn, spawnSync } from "child_process";

export default class LowLevelOS {
	spawnCommand(instruction) {
		instruction.Command__c = JSON.parse(instruction.Command__c.replace(/\\/g, "\\\\"));
		if (debug) log.debug("SPAWNING: " + log.getPrettyJson(instruction.Command__c));

		var process;
		try {
			if (instruction.Command__c.params && instruction.Command__c.params !== "") {
				process = spawn(instruction.Command__c.cmd, instruction.Command__c.params);
			} else {
				process = spawn(instruction.Command__c.cmd);
			}
		} catch (ex) {
			log.debug(ex);
			throw ex;
		}
		process.on("error", (err) => {
			var msg = "child process exited with an error: " + err;
			reportErrorMessage(msg);
		});
	}
	executeCommand(instruction) {
		if (debug) log.debug("EXECUTING: " + instruction.Command__c);
		var process = exec(instruction.Command__c, (error, stdout, stderr) => {
			var output = {
				cmd: instruction.Command__c,
				error
			};
			output.stdout = stdout ? stdout.trim() : "";
			output.stderr = stderr ? stderr.trim() : "";
			if (debug) log.debug("OUTPUT: " + log.getPrettyJson(output));
			instruction.callback(output);
		});
	}
	checkExact(instruction) {
		if (verbose) log.info("CHECKING: [" + instruction.Command__c + "]");
		instruction.callback = (output) => {
			if (output.stdout === instruction.Expected__c) {
				if (verbose) log.success("VALID: [" + output.stdout + "]");
				nextInstruction();
			} else {
				instruction.returned = output;
				reportError(instruction);
				nextInstruction();
			}
		};
		executeCommand(instruction);
	}
	checkContains(instruction) {
		let isExecute = instruction.Operation__c !== "Check Contains";
		if (verbose) {
			if (isExecute) {
				log.info("EXECUTING: [" + instruction.Command__c + "]");
			} else {
				log.info("CHECKING: [" + instruction.Command__c + "]");
			}
		}
		instruction.callback = (output) => {
			var valid = false;

			if (isExecute) {
				valid = true;
			} else {
				if (!instruction.Expected__c) valid = true;
				if (output.stdout != "" && output.stdout.indexOf(instruction.Expected__c) >= 0) valid = true;
				if (output.stderr != "" && output.stderr.indexOf(instruction.Expected__c) >= 0) valid = true;
			}

			if (valid) {
				if (verbose) {
					if (instruction.Expected__c) {
						log.success("VALID: [" + instruction.Expected__c + "]");
					} else {
						log.success(`VALID: [${instruction.Command__c}]`);
					}
				}
			} else {
				instruction.returned = output;
				reportError(instruction);
			}
			nextInstruction();
		};
		if (instruction.Operation__c === "Execute Async") {
			spawnCommand(instruction);
		} else {
			executeCommand(instruction);
		}
	}
	checkPath(instruction) {
		if (verbose) log.info("CHECK PATH: [" + instruction.Command__c + "]");
		instruction.Command__c = 'DIR "' + instruction.Command__c + '" /B';
		if (!instruction.callback) {
			instruction.callback = (output) => {
				if (output.stdout.toLowerCase().indexOf(instruction.Expected__c.toLowerCase()) >= 0) {
					if (verbose) log.success("VALID: [Found: '" + instruction.Expected__c + "']");
					nextInstruction();
				} else {
					instruction.returned = output;
					reportError(instruction);
					nextInstruction();
				}
			};
		}
		executeCommand(instruction);
	}
}
