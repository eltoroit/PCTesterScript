/*
Although this does close chrome, it's killing it forcefully. Meaning Chrome will re-open with tha Restore option :-)
I am not going to follow this idea any furthr (for now)
*/

import fkill from "fkill";
import { tasklist } from "tasklist";

async function findProcesses() {
	const output = [];

	// "Code.exe",
	const appsToClose = ["slack.exe", "notepad++.exe", "firefox.exe", "chrome.exe", "Postman.exe", "java.exe"];

	console.log("");
	console.log("");
	console.log("");
	console.log("");

	let columns = null;
	const processes = await tasklist({ verbose: true });
	for (const process of processes) {
		let line;
		if (!columns) {
			columns = Object.keys(process);
			line = "|";
			columns.forEach((column) => (line += ` ${column} | `));
			console.log(line);

			line = "|";
			columns.forEach((column) => (line += `  --- | `));
			console.log(line);
		}

		let addToList = true;
		if (process.status === "Unknown") addToList = false;
		if (!appsToClose.includes(process.imageName)) addToList = false;

		if (addToList) {
			output.push(process);
			line = "|";
			columns.forEach((column) => (line += ` ${process[column]} | `));
			console.log(line);
		}
	}
	return output;
}

async function closeAllProcesses() {
	let processes = await findProcesses();
	processes = processes.map((process) => process.pid);

	try {
		await fkill(processes, { force: true, forceAfterTimeout: 10e3, tree: true });
	} catch (ex) {
		console.log(ex);
	}
	debugger;
}
closeAllProcesses();
