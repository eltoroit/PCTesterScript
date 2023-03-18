import Logs2 from "./logs.js";
import Colors2 from "./colors.js";
import ETAsserts from "./etAsserts";
import * as fs from "node:fs/promises";
export default class JsonFile {
	config = null;
	constructor({ config }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: config.logs, message: "config.logs" });
		ETAsserts.hasData({ value: config.errors, message: "config.errors" });

		this.config = config;
	}

	parseInstruction({ instruction }) {
		ETAsserts.hasData({ value: instruction, message: "instruction" });
		ETAsserts.hasData({ value: instruction.AppName__c, message: "instruction.AppName__c" });
		ETAsserts.hasData({ value: instruction.Command__c, message: "instruction.Command__c" });
		ETAsserts.hasData({ value: instruction.JSON_Actions__r, message: "instruction.JSON_Actions__r" });
		ETAsserts.equals({ expected: 1, actual: instruction.JSON_Action.totalSize, message: "Multiple JSON Actions are not allowed!" });

		if (this.config.debug) Colors2.debug({ msg: "Parsing JSON_Action__c" });
		let JSON_Action = instruction.JSON_Actions__r.records[0];
		let output = {
			appName: instruction.AppName__c,
			path: instruction.Command__c,
			sections: JSON_Action.Path__c.split(":"),
			key: JSON_Action.Key__c,
			value: JSON_Action.Value__c
		};
		return output;
	}

	// OLD_CODE: jsonFile_Edit(instruction) {
	edit({ appName, path, sections, key, value }) {
		ETAsserts.hasData({ value: appName, message: "appName" });
		ETAsserts.hasData({ value: path, message: "path" });
		ETAsserts.hasData({ value: sections, message: "sections" });
		ETAsserts.hasData({ value: key, message: "key" });
		ETAsserts.hasData({ value: value, message: "value" });

		return new Promise((resolve, reject) => {
			if (this.config.verbose) Colors2.info({ msg: "Editing JSON File: " + appName });
			const data = this.#findData({ path, sections });
			const fileContents = this.#loadFileJson({ path });
			if (this.config.debug) Colors2.debug({ msg: "JSON_Action: " + Colors2.getPrettyJson({ obj: { appName, path, sections } }) });
			if (this.config.debug) Colors2.debug({ msg: "Writing data: " + Colors2.getPrettyJson({ obj: data }) });

			data[key] = value;
			fs.writeFile(path, Colors2.getPrettyJson({ obj: fileContents }))
				.then(() => {
					debugger; // Has it really been updated?
					if (this.config.verbose) Colors2.success({ msg: "VALID: file has been updated: " + path });
					resolve("File is saved with new information");
				})
				.catch((err) => {
					Logs2.reportError({ obj: { appName, path, sections, key, value, err } });
					reject(err);
				});
		});
	}

	jsonFile_Check(instruction) {
		if (verbose) log.info("Reading JSON File: " + instruction.AppName__c);
		const data = jsonFile_FindPath(instruction);
		const JSON_Action = instruction.JSON_Actions__r.records[0];

		if (debug) log.debug("JSON_Action: " + log.getPrettyJson(JSON_Action));
		if (debug) log.debug("Looking here: " + log.getPrettyJson(data));

		if (data[JSON_Action.Key__c] === JSON_Action.Value__c) {
			if (verbose) log.success(`VALID: [${instruction.AppName__c}]`);
			nextInstruction();
		} else {
			instruction.returned = data[JSON_Action.Key__c];
			reportError(instruction);
			reportError({
				Actual: data[JSON_Action.Key__c],
				expected: JSON_Action.Value__c
			});
			nextInstruction();
		}
	}

	doesFileExist({ path }) {
		var exists = false;
		try {
			exists = fs.statSync(path).size > 0;
		} catch (ex) {}

		return exists;
	}

	loadFile({ path }) {
		if (verbose) log.debug("Reading file: " + path);

		if (!doesFileExist(path)) {
			reportErrorMessage("Files does not exist: " + path);
			try {
				fs.writeFileSync(path, "{}");
			} catch (ex) {
				reportErrorMessage("Error creating file: " + path);
			}
		}

		return fs.readFileSync(path, "utf8");
	}

	#loadFileJson({ path }) {
		ETAsserts.hasData({ value: path, message: "path" });

		return JSON.parse(this.loadFile({ path }));
	}

	// OLD_CODE: jsonFile_FindPath(instruction) {
	#findData({ path, sections }) {
		ETAsserts.hasData({ value: path, message: "path" });
		ETAsserts.hasData({ value: sections, message: "sections" });

		if (this.config.debug) Colors2.debug({ msg: "Reading JSON file" });
		let data = this.#loadFileJson({ path });

		if (this.config.debug) Colors2.debug({ msg: "Processing JSON path: " + path });
		for (let i = 0; i < sections.length; i++) {
			let section = sections[i];
			if (section != "") {
				if (section[0] == "[") {
					debugger; // Is this code used?
					/*
					[
						{a: 1},
						{b: 2}
					]
					Find array element whose key has a specific value (Example: If looking for {a:1}, then sections should be [a=1]
					*/
					// Remove [ and ]
					section = section.substring(1, section.length - 1);
					// Split it
					section = section.split("=");
					let key = section[0];
					let value = section[1];
					if (data && data.length > 0) {
						for (let j = 0; j < data.length; j++) {
							let d = data[j];
							if (d[key] == value) {
								data = d;
							}
						}
					} else {
						this.config.logs.reportErrorMessage({ msg: "DATA IS NOT CORRECT (3)" });
						this.config.logs.reportError({ obj: { path, sections, data } });
					}
				} else {
					let s1 = JSON.stringify(data).length;
					data = data[section];
					let s2 = JSON.stringify(data).length;
					if (s1 <= s2) {
						this.config.logs.reportErrorMessage({ msg: "DATA IS NOT CORRECT(4)" });
						this.config.logs.reportError({ obj: { path, sections, data } });
					}
				}
			}
		}
		return data;
	}
}
