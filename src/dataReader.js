import OS2 from "./lowLevelOs.js";
import ET_JSON from "./etJson.js";
import ET_Asserts from "./etAsserts.js";

export default class Data {
	config = null;
	etJson = null;

	constructor({ config }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: config.errors, message: "config.errors" });

		this.config = config;
		this.etJson = new ET_JSON({ config });
	}

	async getData() {
		let data = {
			raw: {
				events: await this.#readRecords({ sObjectName: "etcEvent__c" }),
				rooms: await this.#readRecords({ sObjectName: "etcRoom__c" }),
				computers: await this.#readRecords({ sObjectName: "etcComputer__c" }),
				tasks: await this.#readRecords({ sObjectName: "etcTask__c" }),
				tests: await this.#readRecords({ sObjectName: "etcTest__c" }),
				json: await this.#readRecords({ sObjectName: "etcJSON__c" })
			}
		};

		this.#parseTasks({ data });
		this.#parseTests({ data });
		this.#parseJsons({ data });
		this.#findActiveTests({ data });

		return data;
	}

	#parseTasks({ data }) {
		ET_Asserts.hasData({ value: data, message: "data" });

		let level1 = [];
		let mapById = {};
		let tasks = data.raw.tasks;
		let sortedTasks = tasks.sort((a, b) => (a.Code__c < b.Code__c ? -1 : 1));
		sortedTasks.forEach((task) => {
			let parentName = "";

			task.tests = [];
			task.tasks = [];
			mapById[task.Id] = task;
			if (task.Parent__c) {
				parentName = `${mapById[task.Parent__c].testName} | `;
				mapById[task.Parent__c].tasks.push(task);
			} else {
				level1.push(task.Id);
			}
			task.testName = `${parentName}${task.Name}`;
		});
		level1 = level1.map((taskId) => mapById[taskId]);
		data.tasks = { mapById, level1 };
	}

	#parseTests({ data }) {
		ET_Asserts.hasData({ value: data, message: "data" });

		let tests = data.raw.tests;
		let sortedTests = tests.sort((a, b) => (a.Code__c < b.Code__c ? -1 : 1));
		sortedTests.forEach((test) => {
			let parentTask = data.tasks.mapById[test.Parent__c];
			test.testName = `${parentTask.testName} | ${test.AppName__c}`;
			test.testCode = `${test.AppName__c} ${test.Code__c}`;
			parentTask.tests.push(test);
		});
	}

	#parseJsons({ data }) {
		ET_Asserts.hasData({ value: data, message: "data" });

		let testsWithJson = {};
		data.raw.tests
			.filter((test) => test.Operation__c === "JSON")
			.forEach((test) => {
				test.jsons = [];
				testsWithJson[test.Id] = test;
			});

		data.raw.json.forEach((json) => {
			if (json.IsActive__c) {
				testsWithJson[json.ETC_Test__c].jsons.push(json);
			}
		});
	}

	#findActiveTests({ data }) {
		ET_Asserts.hasData({ value: data, message: "data" });
		let tests = [];

		const processTask = (task) => {
			if (task.IsActive__c) {
				task.tests.forEach((test) => {
					if (test.IsActive__c) {
						tests.push(test);
					}
				});
				task.tasks.forEach((task) => processTask(task));
			}
		};

		data.tasks.level1.forEach((task) => {
			processTask(task);
		});
		let sortedTests = tests.sort((a, b) => (a.Code__c < b.Code__c ? -1 : 1));
		data.tests = sortedTests;
	}

	async #readRecords({ sObjectName }) {
		ET_Asserts.hasData({ value: sObjectName, message: "sObjectName" });

		let path = await OS2.getFullPath({ config: this.config, relativePath: `data\\${sObjectName}.json` });
		let file = await this.etJson.loadFileJson({ path });

		ET_Asserts.equals({
			expected: file.fetched,
			actual: file.total,
			message: `Reading data from file for [${sObjectName}] data but counts do not match [${file.fetched}] !== [${file.total}] (ERR-01)`
		});
		let records = file.records;
		ET_Asserts.equals({
			expected: file.fetched,
			actual: file.total,
			message: `Reading data from file for [${sObjectName}] data but counts do not match [${records.length}] !== [${file.total}] (ERR-02)`
		});
		records = records.map((record) => {
			delete record.attributes;
			return record;
		});
		return records;
	}
}
