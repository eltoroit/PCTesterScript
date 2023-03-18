import Logs2 from "./logs.js";
import OS2 from "./lowLevelOs.js";
import Colors2 from "./colors.js";
import ETAsserts from "./etAsserts";
export default class JsonFile {
	config = null;
	constructor({ config }) {
		ETAsserts.hasData({ value: config, message: "config" });
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
			const fileContents = this.loadFileJson({ path });
			if (this.config.debug) Colors2.debug({ msg: "JSON_Action: " + Colors2.getPrettyJson({ obj: { appName, path, sections } }) });
			if (this.config.debug) Colors2.debug({ msg: "Data before: " + Colors2.getPrettyJson({ obj: fileContents }) });

			data[key] = value;
			if (this.config.debug) Colors2.debug({ msg: "Data after: " + Colors2.getPrettyJson({ obj: data }) });

			OS2.writeFile(path, Colors2.getPrettyJson({ obj: fileContents }))
				.then(() => {
					debugger; // Has it really been updated? I think I am writing the old data (fileContents)
					if (this.config.verbose) Colors2.success({ msg: "VALID: file has been updated: " + path });
					resolve("File is saved with new information");
				})
				.catch((err) => {
					Logs2.reportError({ config: this.config, obj: { appName, path, sections, key, value, err } });
					reject(err);
				});
		});
	}

	check({ appName, path, sections, key, value }) {
		ETAsserts.hasData({ value: appName, message: "appName" });
		ETAsserts.hasData({ value: path, message: "path" });
		ETAsserts.hasData({ value: sections, message: "sections" });
		ETAsserts.hasData({ value: key, message: "key" });
		ETAsserts.hasData({ value: value, message: "value" });

		return new Promise((resolve, reject) => {
			if (this.config.verbose) Colors2.info({ msg: "Reading JSON File: " + appName });
			const data = this.#findData({ path, sections });

			if (this.config.debug) Colors2.debug({ msg: "JSON_Action: " + Colors2.getPrettyJson({ obj: { appName, path, sections } }) });
			if (this.config.debug) Colors2.debug({ msg: "Looking here: " + Colors2.getPrettyJson({ obj: data }) });

			if (data[key] === value) {
				if (this.config.verbose) Colors2.success({ msg: `VALID: [${appName}]` });
				resolve();
			} else {
				const err = { appName, path, sections, key, Actual: data[key], expected: value };
				Logs2.reportError({ config: this.config, obj: err });
				reject(err);
			}
		});
	}

	loadFileJson({ path }) {
		ETAsserts.hasData({ value: path, message: "path" });

		return JSON.parse(OS2.loadFile({ config: this.config, path }));
	}

	// OLD_CODE: jsonFile_FindPath(instruction) {
	#findData({ path, sections }) {
		ETAsserts.hasData({ value: path, message: "path" });
		ETAsserts.hasData({ value: sections, message: "sections" });

		if (this.config.debug) Colors2.debug({ msg: "Reading JSON file" });
		let data = this.loadFileJson({ path });

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
						Logs2.reportErrorMessage({ config: this.config, msg: "DATA IS NOT CORRECT (3)" });
						Logs2.reportError({ config: this.config, obj: { path, sections, data } });
					}
				} else {
					let s1 = JSON.stringify(data).length;
					data = data[section];
					let s2 = JSON.stringify(data).length;
					if (s1 <= s2) {
						Logs2.reportErrorMessage({ config: this.config, msg: "DATA IS NOT CORRECT(4)" });
						Logs2.reportError({ config: this.config, obj: { path, sections, data } });
					}
				}
			}
		}
		return data;
	}
}
