import Logs2 from "./logs.js";
import OS2 from "./lowLevelOs.js";
import Colors2 from "./colors.js";
import ET_Asserts from "./etAsserts.js";
import ET_JSON from "./etJson.js";

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

	async validateBookmarks({ bmChecks }) {
		ET_Asserts.hasData({ value: bmChecks, message: "bmChecks" });

		if (this.config.verbose) Colors2.info({ msg: "Validating all bookmarks for all browsers" });

		// validateBookmarks_Process is not called from here directly because it is going to work asynchronously... invoked from findBookmarks_Firefox.
		// Do not reverse the order here. First Chrome, then Firefox.
		await this.#findBookmarks_Chrome();
		// Firefox must be last!
		await this.#findBookmarks_Firefox();

		await this.#writeToFiles();
		await this.#validateBookmarks_Process({ bmChecks });
	}

	async #openUrl({ urlToCheck }) {
		ET_Asserts.hasData({ value: urlToCheck, message: "urlToCheck" });

		if (this.config.checkUrlExists) {
			try {
				let outputFetch = await OS2.fetch({ config: this.config, url: urlToCheck });
				if (outputFetch.response.status >= 200 && outputFetch.response.status < 300) {
					if (this.config.debug) Colors2.debug({ msg: `HTTP Status: ${outputFetch.response.status}` });
					if (this.config.verbose) Colors2.debug({ msg: outputFetch.body.substring(0, 250) });
				} else {
					throw new Error("Not able to fetch");
				}
			} catch (ex) {
				let msg = "URL [" + urlToCheck + "] was not validated";
				Logs2.reportException({ config: this.config, msg, ex });
				throw ex;
			}
		}
	}

	async #findBookmarks_Chrome() {
		const findBookmarks_Chrome_Children = ({ node, path }) => {
			ET_Asserts.hasData({ value: node, message: "node" });
			if (path !== "") ET_Asserts.hasData({ value: path, message: "path" });

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
					findBookmarks_Chrome_Children({ node: node.children[i], path: thisPath });
				}
			}
		};

		if (this.config.verbose) Colors2.info({ msg: "Finding Chrome bookmarks" });

		const data = await this.etJSON.loadFileJson({ path: this.bmChromePath });
		findBookmarks_Chrome_Children({ node: data["roots"]["bookmark_bar"], path: "" });
	}

	async #findBookmarks_Firefox() {
		const findSqlLiteFilePath = async () => {
			let sqlitepath = "";
			let folders = await OS2.fsReadDir({ config: this.config, path: this.bmFirefoxPath[0] });
			if (this.config.debug) Colors2.debug({ msg: `[Firefox Bookmarks][LOLG]: Foders found: ${Colors2.getPrettyJson({ obj: folders })}` });
			let validFolders = folders.filter(async (folder) => {
				let tmp = `${this.bmFirefoxPath[0]}\\${folder}\\${this.bmFirefoxPath[2]}`;
				if (this.config.debug) console.log(`Checking path: ${tmp}`);
				return await OS2.fsExists({ config: this.config, path: tmp });
			});
			if (this.config.debug) Colors2.debug({ msg: `Checking paths (output): ${Colors2.getPrettyJson({ obj: validFolders })}` });
			if (validFolders.length == 1) {
				sqlitepath = `${this.bmFirefoxPath[0]}\\${validFolders[0]}\\${this.bmFirefoxPath[2]}`;
				if (this.config.debug) Colors2.debug({ msg: `[Firefox Bookmarks][OK]: Full bookmars path: ${sqlitepath}` });
				return sqlitepath;
			} else {
				let msg = "[Firefox Bookmarks][ERROR]: Multiple profiles for Firefox found";
				Logs2.reportErrorMessage({ config: this.config, msg });
				throw new Error(msg);
			}
		};

		const getSqlLiteContent = async ({ sqlitepath }) => {
			ET_Asserts.hasData({ value: sqlitepath, message: "sqlitepath" });

			try {
				// Execute sqlite3 to get data
				let bmTempFFLinePath = await OS2.getFullPath({ config: this.config, relativePath: "data/bmTempFF_LINE.txt", skipCheck: true });
				let path = await OS2.getFullPath({ config: this.config, relativePath: "scripts/sqlite3.exe" });
				let sql = `SELECT b.id, b.parent, b.title as bTitle, p.title as pTitle, p.url FROM moz_bookmarks AS b LEFT JOIN moz_places AS p ON b.fk = p.id`;
				let cmd = `${path} -header -line "${sqlitepath}" "${sql}" > ${bmTempFFLinePath}`;
				if (this.config.verbose) Colors2.debug({ msg: "Executing command: " + cmd });
				await OS2.execute({ config: this.config, command: cmd });
				// Add one more line
				await OS2.fsAppendFile({ config: this.config, path: bmTempFFLinePath, data: "\r\n" });
				let lines = await OS2.readLines({ config: this.config, path: bmTempFFLinePath });
				return lines;
			} catch (ex) {
				let msg = "Error quering Firefox bookmarks";
				Logs2.reportException({ config: this.config, msg, ex });
				throw ex;
			}
		};

		const processLines = async ({ lines }) => {
			ET_Asserts.hasData({ value: lines, message: "lines" });

			let record = {};
			let data = {};
			data.URLs = {};
			data.TitlesByRow = {};
			data.TitlesByName = {};

			lines.forEach((line) => {
				if (line == "") {
					if (record.bTitle == "toolbar") {
						record.bTitle = "BAR";
					}
					if (data.TitlesByRow[record.id]) {
						Logs2.reportErrorMessage({ config: this.config, msg: "Searching for Firefox bookmars: *" + record.id + "* was already defined" });
					} else {
						data.TitlesByRow[record.id] = "";
					}
					if (record.url) {
						data.URLs[record.id] = record.url;
					}
					if (record.bTitle) {
						let title = "";
						if (record.parent) {
							title = data.TitlesByRow[record.parent];
						}
						title += "[" + record.bTitle + "]";
						if (data.TitlesByName[title]) {
							Logs2.reportErrorMessage({ config: this.config, msg: "Searching for Firefox bookmars: Duplicate record: [" + record.bTitle + "]" });
						}
						data.TitlesByRow[record.id] = title;
						data.TitlesByName[title] = record.id;
					}

					record = {};
				} else {
					let parts = line.split("=");
					record[parts[0].trim()] = parts[1].trim();
				}
			});
			return data;
		};

		const linesPostProcess = async ({ data }) => {
			ET_Asserts.hasData({ value: data, message: "data" });

			// Merge the data
			for (let path in data.TitlesByName) {
				if (path.startsWith("[BAR]")) {
					if (Object.prototype.hasOwnProperty.call(data.TitlesByName, path)) {
						let rowId = data.TitlesByName[path];
						let url = data.URLs[rowId];
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
			let data = await processLines({ lines });
			await linesPostProcess({ data });
		} catch (ex) {
			let msg = "Error quering Firefox bookmarks";
			Logs2.reportException({ config: this.config, msg, ex });
			throw ex;
		}
	}

	async #writeToFiles() {
		let bmDumpPath = await OS2.getFullPath({ config: this.config, relativePath: "data/bmDump.json", skipCheck: true });
		try {
			await OS2.writeFile({
				config: this.config,
				path: bmDumpPath,
				data: JSON.stringify(this.bm.Bar, null, 4)
			});
			if (this.config.debug) Colors2.info({ msg: "The file [" + bmDumpPath + "] was saved!" });
		} catch (ex) {
			let msg = `Failed to save: ${bmDumpPath}`;
			Logs2.reportException({ config: this.config, msg, ex });
			throw ex;
		}
	}

	async #validateBookmarks_Process({ bmChecks }) {
		ET_Asserts.hasData({ value: bmChecks, message: "bmChecks" });

		if (this.config.verbose) Colors2.info({ msg: "Validating Bookmarks" });

		const validateBookmark = async ({ bmCheck }) => {
			ET_Asserts.hasData({ value: bmChecks, message: "bmChecks" });

			let errorCount = 0;
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
					Logs2.reportException({ config: this.config, msg, ex });
					throw new Error(msg);
				}
			}
		};

		// Must be done in series
		for (let bmCheck of bmChecks) {
			await validateBookmark({ bmCheck });
		}
	}
}
