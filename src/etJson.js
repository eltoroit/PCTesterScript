import Logs2 from "./logs.js";
import OS2 from "./lowLevelOs.js";
import Colors2 from "./colors.js";
import ET_Asserts from "./ET_Asserts";
export default class JsonFile {
	config = null;
	constructor({ config }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: config.errors, message: "config.errors" });

		this.config = config;
	}

	parseInstruction({ instruction }) {
		ET_Asserts.hasData({ value: instruction, message: "instruction" });
		ET_Asserts.hasData({ value: instruction.AppName__c, message: "instruction.AppName__c" });
		ET_Asserts.hasData({ value: instruction.Command__c, message: "instruction.Command__c" });
		ET_Asserts.hasData({ value: instruction.JSON_Actions__r, message: "instruction.JSON_Actions__r" });
		ET_Asserts.equals({ expected: 1, actual: instruction.JSON_Action.totalSize, message: "Multiple JSON Actions are not allowed!" });

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

	async loadFileJson({ path }) {
		ET_Asserts.hasData({ value: path, message: "path" });

		return JSON.parse(await OS2.readFile({ config: this.config, path }));
	}

	// OLD_CODE: jsonFile_Edit(instruction) {
	async edit({ appName, path, sections, key, value }) {
		ET_Asserts.hasData({ value: appName, message: "appName" });
		ET_Asserts.hasData({ value: path, message: "path" });
		ET_Asserts.hasData({ value: sections, message: "sections" });
		ET_Asserts.hasData({ value: key, message: "key" });
		ET_Asserts.hasData({ value: value, message: "value" });

		if (this.config.verbose) Colors2.info({ msg: "Editing JSON File: " + appName });
		const data = await this.#findData({ path, sections });
		const fileContents = await this.loadFileJson({ path });
		if (this.config.debug) Colors2.debug({ msg: "JSON_Action: " + Colors2.getPrettyJson({ obj: { appName, path, sections } }) });
		if (this.config.debug) Colors2.debug({ msg: "Data before: " + Colors2.getPrettyJson({ obj: fileContents }) });

		data[key] = value;
		if (this.config.debug) Colors2.debug({ msg: "Data after: " + Colors2.getPrettyJson({ obj: data }) });

		try {
			await OS2.writeFile(path, Colors2.getPrettyJson({ obj: fileContents }));
			debugger; // Has it really been updated? I think I am writing the old data (fileContents)
			if (this.config.verbose) Colors2.success({ msg: "VALID: file has been updated: " + path });
			return "File is saved with new information";
		} catch (ex) {
			Logs2.reportError({ config: this.config, obj: { appName, path, sections, key, value, err } });
			throw ex;
		}
	}

	async check({ appName, path, sections, key, value }) {
		ET_Asserts.hasData({ value: appName, message: "appName" });
		ET_Asserts.hasData({ value: path, message: "path" });
		ET_Asserts.hasData({ value: sections, message: "sections" });
		ET_Asserts.hasData({ value: key, message: "key" });
		ET_Asserts.hasData({ value: value, message: "value" });

		if (this.config.verbose) Colors2.info({ msg: "Reading JSON File: " + appName });
		const data = await this.#findData({ path, sections });

		if (this.config.debug) Colors2.debug({ msg: "JSON_Action: " + Colors2.getPrettyJson({ obj: { appName, path, sections } }) });
		if (this.config.debug) Colors2.debug({ msg: "Looking here: " + Colors2.getPrettyJson({ obj: data }) });

		if (data[key] === value) {
			if (this.config.verbose) Colors2.success({ msg: `VALID: [${appName}]` });
			return;
		} else {
			const err = { appName, path, sections, key, Actual: data[key], expected: value };
			Logs2.reportError({ config: this.config, obj: err });
			throw new Error(err);
		}
	}

	// OLD_CODE: jsonFile_FindPath(instruction) {
	async #findData({ path, sections }) {
		ET_Asserts.hasData({ value: path, message: "path" });
		ET_Asserts.hasData({ value: sections, message: "sections" });

		if (this.config.debug) Colors2.debug({ msg: "Reading JSON file" });
		let data = await this.loadFileJson({ path });

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
