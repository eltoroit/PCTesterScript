import Logs2 from "./logs.js";
import OS2 from "./lowLevelOs.js";
import Colors2 from "./colors.js";
import ET_Asserts from "./etAsserts.js";
import ET_JSON from "./etJson.js";

import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
			tasks: await this.#readRecords({ sObjectName: "etcTask__c" }),
			tests: await this.#readRecords({ sObjectName: "etcTest__c" }),
			json: await this.#readRecords({ sObjectName: "etcJSON__c" })
		};

		return data;
	}

	async #readRecords({ sObjectName }) {
		ET_Asserts.hasData({ value: sObjectName, message: "sObjectName" });

		let path = `${__dirname}\\..\\data\\${sObjectName}.json`;
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
