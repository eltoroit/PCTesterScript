import Logs2 from "./logs.js";
import { resolve } from "path";
import fetch from "node-fetch";
import Colors2 from "./colors.js";
import { exec } from "child_process";
import * as fs from "node:fs/promises";
import ET_Asserts from "./etAsserts.js";

export default class LowLevelOS {
	static async getFullPath({ config, relativePath, skipCheck = false }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: relativePath, message: "relativePath" });

		let path = resolve(relativePath);
		if (skipCheck) {
			return path;
		} else {
			if (await LowLevelOS.fsExists({ config, path })) {
				return path;
			} else {
				let msg = `${path} could not be found`;
				Logs2.reportErrorMessage({ config, msg });
				throw new Error(msg);
			}
		}
	}

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
		const fileExists = await LowLevelOS.doesFileExist({ config, path });
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
			let msg = `Error creating file: ${path}"`;
			Logs2.reportException({ config: this.config, msg, ex });
			throw ex;
		}
	}

	static async readLines({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		if (config.debug) Colors2.debug({ msg: `Reading lines from [${path}]` });

		let fileContents = await LowLevelOS.readFile({ config, path });
		let lines = fileContents.split("\r\n");
		lines = lines.map((line) => line.trim());
		return lines;
	}

	static async fsReadDir({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		if (config.debug) Colors2.debug({ msg: "Finding files in: " + path });
		return await fs.readdir(path);
	}

	static async fsExists({ config, path }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });

		if (config.debug) Colors2.debug({ msg: "Validating full path: " + path });
		try {
			await fs.stat(path);
			return true;
		} catch (ex) {
			return false;
		}
	}

	static async fsAppendFile({ config, path, data }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: path, message: "path" });
		ET_Asserts.hasData({ value: data, message: "data" });

		if (config.debug) Colors2.debug({ msg: `Appending [${data}] to [${path}]` });
		return await fs.appendFile(path, data);
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

	static async fetch({ config, url, method = "GET", body, isJsonBody }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: url, message: "url" });
		ET_Asserts.hasData({ value: method, message: "method" });
		ET_Asserts.includes({ value: method, listValues: ["GET", "POST"], message: "HTTP method not allowed" });
		if (method === "POST") {
			ET_Asserts.hasData({ value: body, message: "body" });
		}

		let response;
		if (config.verbose) Colors2.info({ msg: `Fetch (${method}) ${url}` });
		if (method === "GET") {
			response = await fetch(url);
		} else {
			if (isJsonBody) {
				response = await fetch(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
			} else {
				response = await fetch(url, { method: "POST", body });
			}
		}
		return {
			response,
			body: await response.text()
		};
	}

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
