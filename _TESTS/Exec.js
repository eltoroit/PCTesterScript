import { exec, execSync, spawn, spawnSync } from "child_process";

function executeCommand(command) {
	return new Promise((resolve, reject) => {
		let output = {
			cmd: command,
			stdout: null,
			stderr: null
		};

		let isExec = true;
		if (isExec) {
			let process = exec(command, (error, stdout, stderr) => {
				output.stdout = stdout ? stdout.trim() : "";
				output.stderr = stderr ? stderr.trim() : "";
				output.error = error ? error.message.trim() : "";
				if (error) {
					reject({ error, output });
				} else {
					resolve(output);
				}
			});
		} else {
			let process = spawn(command);
			process.stdout.on("data", (data) => {
				console.log(`stdout: ${data}`);
			});

			process.stderr.on("data", (data) => {
				console.error(`stderr: ${data}`);
			});

			process.on("close", (code) => {
				console.log(`CLOSED ${code}`);
			});

			process.on("exit", (code, signal) => {
				console.log(`EXIT`, code, signal);
			});

			process.on("error", (error) => {
				console.log(`ERROR ${error}`);
			});
		}
	});
}

debugger;
// executeCommand("sfdx force:org:list --all --clean")
executeCommand("code.cmd --wait")
	.then((x) => {
		console.log("GOOD: ", JSON.stringify(x));
	})
	.catch((x) => {
		console.log("BAD: ", JSON.stringify(x));
	});
