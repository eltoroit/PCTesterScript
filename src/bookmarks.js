import Logs2 from "./logs.js";
import OS2 from "./lowLevelOs.js";
import Colors2 from "./colors.js";
import ET_Asserts from "./etAsserts.js";
import ET_JSON from "./etJson.js";

const bmPretendPath = "./bmPretend.json";
const bmCheckPath = "./bmCheck.json";
const bmDumpPath = "./bmDump.json";
const bmTempFFLinePath = "./bmTempFF_LINE.txt";

export default class Bookmarks {
	bm = {};
	config = null;
	etJSON = null;
	bmChromePath = null;
	bmFirefoxPath = null;

	constructor({ config }) {
		ET_Asserts.hasData({ value: config, message: "config" });
		ET_Asserts.hasData({ value: config.errors, message: "config.errors" });

		this.bm.FF = {};
		this.bm.Bar = {};
		this.bm.Chrome = {};
		this.config = config;
		this.etJSON = new ET_JSON({ config: this.config });

		this.bmChromePath = `C:\\Users\\${this.config.adminUser}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Bookmarks`;
		this.bmFirefoxPath = [`C:\\Users\\${this.config.adminUser}\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles`, "*.default-release", "places.sqlite"];
	}

	async validateBookmarks() {
		if (this.config.verbose) Colors2.info({ msg: "Validating all bookmarks for all browsers" });

		if (await OS2.doesFileExist({ config: this.config, path: bmPretendPath })) {
			Colors2.error({ msg: "Bookmarks information read from file [" + bmPretendPath + "]" });
			this.bm = await OS2.loadFileJson({ path: bmPretendPath });
			await this.#validateBookmarks_Process();
		} else {
			// validateBookmarks_Process is not called from here directly because it is going to work asynchronously... invoked from findBookmarks_Firefox.
			// Do not reverse the order here. First Chrome, then Firefox.
			await this.#findBookmarks_Chrome();
			await this.#findBookmarks_Firefox(); // Firefox must be last!

			await this.#writeToFiles();
			await this.#validateBookmarks_Process();
		}
	}

	async #openUrl({ urlToCheck }) {
		ET_Asserts.hasData({ value: urlToCheck, message: "urlToCheck" });

		if (this.config.checkUrlExists) {
			try {
				let outputCurl = await OS2.execute({ config: this.config, command: `curl ${urlToCheck}` });
				if (this.config.verbose) Colors2.debug({ msg: outputCurl });
				if (this.config.debug) Colors2.debug({ msg: JSON.stringify(outputCurl.stdout.toString("utf8")).substring(0, 250) });
			} catch (ex) {
				let err = "URL [" + urlToCheck + "] was not validated";
				if (this.config.debug) Colors2.debug({ msg: err });
				throw new Error(err);
			}
		}
	}

	async #findBookmarks_Chrome() {
		const findBookmarks_Chrome_Children = ({ node, path }) => {
			ET_Asserts.hasData({ value: node, message: "node" });
			ET_Asserts.hasData({ value: path, message: "path" });

			let thisPath;

			if (node.name == "Bookmarks bar") {
				thisPath = "[BAR]";
			} else {
				thisPath = path + "[" + node.name + "]";
			}
			if (node.url) {
				let barNode = this.bm.Bar[thisPath];
				if (!barNode) barNode = {};
				barNode.Chrome = node.url;
				this.bm.Bar[thisPath] = barNode;
				this.bm.Chrome[thisPath] = node.url;
			}
			if (node.children) {
				for (let i = 0; i < node.children.length; i++) {
					findBookmarks_Chrome_Children(node.children[i], thisPath);
				}
			}
		};

		if (this.config.verbose) Colors2.info({ msg: "Finding Chrome bookmarks" });

		const data = await this.etJSON.loadFileJson({ path: this.bmChromePath });
		findBookmarks_Chrome_Children(data["roots"]["bookmark_bar"], "");
	}

	async #findBookmarks_Firefox() {
		const findSqlLiteFilePath = async () => {
			let sqlitepath = "";
			let folders = OS2.fsReadDir({ config: this.config, path: this.bmFirefoxPath[0] });
			if (this.config.debug) Colors2.debug({ msg: `[Firefox Bookmarks][LOLG]: Foders found: ${Colors2.getPrettyJson({ obj: folders })}` });
			let validFolders = folders.filter((folder) => {
				let tmp = `${this.bmFirefoxPath[0]}\\${folder}\\${this.bmFirefoxPath[2]}`;
				if (this.config.debug) console.log(`Checking path: ${tmp}`);
				return OS2.fsExists({ config: this.config, path: tmp });
			});
			if (this.config.debug) Colors2.debug({ msg: `Checking paths (output): ${Colors2.getPrettyJson({ obj: validFolders })}` });
			if (validFolders.length == 1) {
				sqlitepath = `${this.bmFirefoxPath[0]}\\${validFolders[0]}\\${this.bmFirefoxPath[2]}`;
				if (this.config.debug) Colors2.debug({ msg: `[Firefox Bookmarks][OK]: Full bookmars path: ${sqlitepath}` });
				return;
			} else {
				let msg = "[Firefox Bookmarks][ERROR]: Multiple profiles for Firefox found";
				Logs2.reportErrorMessage({ config: this.config, msg });
				throw new Error(msg);
			}
		};

		const getSqlLiteContent = async ({ sqlitepath }) => {
			ET_Asserts.hasData({ value: sqlitepath, message: "sqlitepath" });

			// Execute sqlite3 to get data
			let sql = `SELECT b.id, b.parent, b.title as bTitle, p.title as pTitle, p.url FROM moz_bookmarks AS b LEFT JOIN moz_places AS p ON b.fk = p.id`;
			let cmd = `sqlite3 -header -line "${sqlitepath}" "${sql}" > ${bmTempFFLinePath}`;
			if (this.config.verbose) Colors2.debug({ msg: "Execting command: " + cmd });
			// Add one more line
			await OS2.appendFileSync(bmTempFFLinePath, "\r\n");
			try {
				await OS2.execute({ config: this.config, command: cmd });
				let lines = await OS2.readLines({ config: this.config, bmTempFFLinePath });
				return lines;
			} catch (ex) {
				Logs2.reportError({ config: this.config, obj: ex });
				throw ex;
			}
		};

		const processLines = async ({ lines }) => {
			ET_Asserts.hasData({ value: lines, message: "lines" });

			let record = {};
			let tmp = {};
			tmp.URLs = {};
			tmp.TitlesByRow = {};
			tmp.TitlesByName = {};

			lines.forEach((line) => {
				if (line == "") {
					if (record.bTitle == "toolbar") {
						record.bTitle = "BAR";
					}
					if (tmp.TitlesByRow[record.id]) {
						Logs2.reportErrorMessage({ config: this.config, msg: "Searching for Firefox bookmars: *" + record.id + "* was already defined" });
					} else {
						tmp.TitlesByRow[record.id] = "";
					}
					if (record.url) {
						tmp.URLs[record.id] = record.url;
					}
					if (record.bTitle) {
						let title = "";
						if (record.parent) {
							title = tmp.TitlesByRow[record.parent];
						}
						title += "[" + record.bTitle + "]";
						if (tmp.TitlesByName[title]) {
							Logs2.reportErrorMessage({ config: this.config, msg: "Searching for Firefox bookmars: Duplicate record: [" + record.bTitle + "]" });
						}
						tmp.TitlesByRow[record.id] = title;
						tmp.TitlesByName[title] = record.id;
					}

					record = {};
				} else {
					let parts = line.split("=");
					record[parts[0].trim()] = parts[1].trim();
				}
			});
			return tmp;
		};

		const linesPostProcess = async ({ tmp }) => {
			ET_Asserts.hasData({ value: tmp, message: "tmp" });

			// Merge the data
			for (let path in tmp.TitlesByName) {
				if (path.startsWith("[BAR]")) {
					if (Object.prototype.hasOwnProperty.call(tmp.TitlesByName, path)) {
						let rowId = tmp.TitlesByName[path];
						let url = tmp.URLs[rowId];
						if (url) {
							let barNode = this.bm.Bar[path];
							if (!barNode) barNode = {};
							barNode.FF = url;
							this.bm.Bar[path] = barNode;

							this.bm.FF[path] = url;
						}
					}
				}
			}

			// Check this.bm.Bar
			let bmBarNew = [];
			let bmCounter = 0;
			let bmBarTemp = this.bm.Bar;

			for (let path in bmBarTemp) {
				if (Object.prototype.hasOwnProperty.call(bmBarTemp, path)) {
					let nodeNew = {};
					let nodeTemp = bmBarTemp[path];
					bmCounter++;

					nodeNew.id = "BM_" + bmCounter;
					nodeNew.title = path;

					// Put existing URLs
					nodeNew.urlChrome = nodeTemp.Chrome;
					nodeNew.urlFirefox = nodeTemp.FF;
					nodeNew.urlExpected = nodeNew.urlChrome === nodeNew.urlFirefox ? nodeNew.urlChrome : "NO_IDEA";

					// Check if the url is defined in each browser
					nodeNew.hasFF = nodeTemp.FF ? true : false;
					nodeNew.hasChrome = nodeTemp.Chrome ? true : false;

					// Assume we are going to be checking all browsers
					nodeNew.checkFF = true;
					nodeNew.checkChrome = true;

					bmBarNew.push(nodeNew);
				}
			}
			this.bm.Bar = bmBarNew;
		};

		if (this.config.verbose) Colors2.info({ msg: "Finding Firefox bookmarks" });
		if (this.config.debug) Colors2.debug({ msg: `[Firefox Bookmarks][LOLG]: Searching for Firefox bookmars at path: ${this.bmFirefoxPath[0]}` });

		try {
			let sqlitepath = await findSqlLiteFilePath();
			let lines = await getSqlLiteContent({ sqlitepath });
			let tmp = await processLines({ lines });
			await linesPostProcess({ tmp });
		} catch (ex) {
			Logs2.reportErrorMessage({ config: this.config, msg: "Failed checking Firefox" });
		}
	}

	async #writeToFiles() {
		try {
			await OS2.writeFile({
				config: this.config,
				path: bmDumpPath,
				data: JSON.stringify({ DTTM: new Date().toJSON(), bm: this.bm.Bar }, null, 4)
			});
			if (this.config.debug) Colors2.info({ msg: "The file [" + bmDumpPath + "] was saved!" });
		} catch (ex) {
			Logs2.reportErrorMessage({ config: this.config, msg: `Failed to save: ${bmDumpPath}` });
		}

		try {
			await OS2.writeFile({
				config: this.config,
				path: bmPretendPath,
				data: JSON.stringify(JSON.stringify(this.bm, null, 4))
			});
			if (this.config.debug) Colors2.info({ msg: "The file [" + bmPretendPath + "] was saved!" });
		} catch (ex) {
			Logs2.reportErrorMessage({ config: this.config, msg: `Failed to save: ${bmPretendPath}` });
		}
	}

	async #validateBookmarks_Process() {
		if (this.config.verbose) Colors2.info({ msg: "Validating Bookmarks" });

		let errorCount = 0;
		let bmChecks = await this.etJSON.loadFileJson({ path: bmCheckPath });

		bmChecks.forEach(async (bmCheck) => {
			let hasErrors = false;
			let urlFF = this.bm.FF[bmCheck.title];
			let urlChrome = this.bm.Chrome[bmCheck.title];
			let expectedUrl = bmCheck.urlExpected;

			Colors2.info({ msg: "Bookmark: " + bmCheck.title });

			if (bmCheck.checkFF && bmCheck.checkChrome) {
				if (urlFF != urlChrome && urlFF && urlChrome) {
					errorCount++;
					hasErrors = true;
					let msg = {
						errorCode: 1,
						bmCheckId: bmCheck.id,
						errorMsg: "Urls are different for Firefox and Chrome.",
						urlTitle: bmCheck.title,
						urlFirefox: urlFF,
						urlChrome: urlChrome
					};
					Logs2.reportErrorMessage({ config: this.config, msg });
				}
			}

			if (bmCheck.checkFF) {
				if (expectedUrl !== urlFF) {
					errorCount++;
					hasErrors = true;
					let msg = {
						errorCode: 1,
						bmCheckId: bmCheck.id,
						errorMsg: "Url in Firefox is not the expected value",
						urlTitle: bmCheck.title,
						urlExpected: expectedUrl,
						urlFirefox: urlFF
					};
					Logs2.reportErrorMessage({ config: this.config, msg });
				}
			}

			if (bmCheck.checkChrome) {
				if (expectedUrl !== urlChrome) {
					errorCount++;
					hasErrors = true;
					let msg = {
						errorCode: 3,
						bmCheckId: bmCheck.id,
						errorMsg: "Url in Chrome is not the expected value",
						urlTitle: bmCheck.title,
						urlExpected: expectedUrl,
						urlChrome: urlChrome
					};
					Logs2.reportErrorMessage({ config: this.config, msg });
				}
			}

			if (!hasErrors) {
				try {
					await this.#openUrl({ urlToCheck: expectedUrl });
					if (this.config.verbose) Colors2.success({ msg: "VALID: Bookmark *" + bmCheck.title + "*, URL [" + expectedUrl + "]" });
				} catch (ex) {
					errorCount++;
					hasErrors = true;
					let msg = {
						errorCode: 4,
						bmCheckId: bmCheck.id,
						errorMsg: "Url can't be accessed",
						urlTitle: bmCheck.title,
						urlExpected: expectedUrl
					};
					Logs2.reportErrorMessage({ config: this.config, msg });
				}
			}
		});
	}
}
