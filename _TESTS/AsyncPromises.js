function delay({ msg, fails }) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			fails = fails !== undefined ? fails : Math.random() > 0.5;
			if (fails) {
				reject({ msg });
			} else {
				resolve({ msg });
			}
		}, 1000);
	});
}

async function asyncMethod() {
	// try {
	// 	return await delay({ msg: "Regular async/await", fails: true });
	// } catch (ex) {
	// 	throw ex;
	// }
	return "5";
}

async function promiseMethod() {
	return new Promise((resolve, reject) => {
		delay({ msg: "Promise", fails: true })
			.then((data) => {
				resolve({ status: "CHECK: SUCCESS: ", data });
			})
			.catch((error) => {
				reject({ status: "CHECK: FAIL: ", error });
			});
	});
}

debugger;
asyncMethod()
	.then((data) => {
		console.log("DONE: SUCCESS: ", data);
	})
	.catch((error) => {
		console.log("DONE: FAIL: ", error);
	});
