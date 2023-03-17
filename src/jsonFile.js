export default class JsonFile {
	jsonFile_FindPath(instruction) {
		if (debug) log.debug("Reading JSON_Action__c");
		var JSON_Action = instruction.JSON_Actions__r;
		if (JSON_Action.totalSize !== 1) throw new Error("Multiple JSON Actions are not allowed!");
		JSON_Action = JSON_Action.records[0];

		if (debug) log.debug("Reading JSON file");
		let data = loadFileJson(instruction.Command__c);
		var paths = JSON_Action.Path__c.split(":");

		if (debug) log.debug("Processing JSON path: " + JSON_Action.Path__c);
		for (var i = 0; i < paths.length; i++) {
			var path = paths[i];
			if (path != "") {
				if (path[0] == "[") {
					// Remove [ and ]
					path = path.substring(1, path.length - 1);
					// Split it
					path = path.split("=");
					var key = path[0];
					var value = path[1];
					if (data && data.length > 0) {
						for (var j = 0; j < data.length; j++) {
							var d = data[j];
							if (d[key] == value) {
								data = d;
							}
						}
					} else {
						reportErrorMessage("DATA IS NOT CORRECT (3)");
						reportError(instruction);
					}
				} else {
					var s1 = JSON.stringify(data).length;
					data = data[path];
					var s2 = JSON.stringify(data).length;
					if (s1 <= s2) {
						reportErrorMessage("DATA IS NOT CORRECT(4)");
						reportError(instruction);
					}
				}
			}
		}
		return data;
	}
	jsonFile_Edit(instruction) {
		if (verbose) log.info("Editing JSON File: " + instruction.AppName__c);
		const data = jsonFile_FindPath(instruction);
		const JSON_Action = instruction.JSON_Actions__r.records[0];
		const fileContents = loadFileJson(instruction.Command__c);

		if (debug) log.debug("JSON_Action: " + log.getPrettyJson(JSON_Action));
		if (debug) log.debug("Writing data: " + log.getPrettyJson(data));
		data[JSON_Action.Key__c] = JSON_Action.Value__c;
		fs.writeFile(instruction.Command__c, log.getPrettyJson(fileContents), (err) => {
			instruction.returned = err;
			instruction.Expected__c = "File is saved with new information";
			if (err) {
				reportError(instruction);
				nextInstruction();
			} else {
				if (verbose) log.success("VALID: file has been updated: " + instruction.Command__c);
				nextInstruction();
			}
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
	loadFileJson(path) {
		return JSON.parse(loadFile(path));
	}
	doesFileExist(path) {
		var exists = false;
		try {
			exists = fs.statSync(path).size > 0;
		} catch (ex) {}

		return exists;
	}
	loadFile(path) {
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
}
