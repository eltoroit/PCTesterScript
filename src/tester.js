import colorLogs from "./colorLogs.js";

class Tester {
	constructor() {}

	start() {
		colorLogs.error("Hello World");
	}
}

let t = new Tester();
t.start();
