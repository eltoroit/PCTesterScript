import ET_Asserts from "./etAsserts.js";

export default class Tester {
	config = null;

	constructor({ config }) {
		ET_Asserts.hasData({ value: config, message: "config" });

		this.config = config;
	}

	test({ data }) {
		ET_Asserts.hasData({ value: data, message: "data" });

		debugger;
		console.log("Test");
	}
}
