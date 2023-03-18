import Colors2 from "./colors.js";
import ETAsserts from "./etAsserts";
import JSON_FILE from "./jsonFile.js";
import { exec, execSync, spawn, spawnSync } from "child_process";

const bmPretendPath = "./bmPretend.json";
const bmCheckPath = "./bmCheck.json";
const bmDumpPath = "./bmDump.json";
const bmTempFFLinePath = "./bmTempFF_LINE.txt";

export default class Bookmarks {
	bm = {};
	config = null;
	bmChromePath = null;
	bmFirefoxPath = null;

	constructor({ config }) {
		ETAsserts.hasData({ value: config, message: "config" });
		ETAsserts.hasData({ value: config.errors, message: "config.errors" });

		this.bm.FF = {};
		this.bm.Bar = {};
		this.bm.Chrome = {};
		this.config = config;

		this.bmChromePath = `C:\\Users\\${this.config.adminUser}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Bookmarks`;
		this.bmFirefoxPath = [`C:\\Users\\${this.config.adminUser}\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles`, "*.default-release", "places.sqlite"];
	}

	openUrl({ urlToCheck }) {
		return new Promise((resolve, reject) => {
			if (this.config.checkUrlExists) {
				let process = spawnSync("curl", [urlToCheck]);
				if (this.config.verbose) Colors2.debug({ msg: process.stderr });
				if (this.config.debug) Colors2.debug({ msg: JSON.stringify(process.stdout.toString("utf8")).substring(0, 250) });

				if (process.status == 0) {
					resolve();
				} else {
					reject("Invalid url: " + urlToCheck);
				}
			} else {
				if (this.config.debug) Colors2.debug({ msg: "URL [" + urlToCheck + "] was not validated" });
				resolve();
			}
		});
	}
	findBookmarks_Chrome_Children({ node, path }) {
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
				this.findBookmarks_Chrome_Children(node.children[i], thisPath);
			}
		}
	}
	findBookmarks_Chrome() {
		if (this.config.verbose) Colors2.info({ msg: "Finding Chrome bookmarks" });

		const data = loadFileJson(bmChromePath);
		findBookmarks_Chrome_Children(data["roots"]["bookmark_bar"], "");
	}
	findBookmarks_Firefox() {
		if (this.config.verbose) Colors.info("Finding Firefox bookmarks");

		var tmp = {};
		var record = {};
		var sqlitepath = "";

		tmp.TitlesByRow = {};
		tmp.TitlesByName = {};
		tmp.URLs = {};

		// Find sqlite path
		if (debug) Colors.debug(`[Firefox Bookmarks][LOLG]: Searching for Firefox bookmars at path: ${bmFirefoxPath[0]}`);
		try {
			var folders = fs.readdirSync(bmFirefoxPath[0]);
			if (debug) Colors.debug(`[Firefox Bookmarks][LOLG]: Foders found: ${JSON.stringify(folders)}: `);
			let validFolders = folders.filter((folder) => {
				let tmp = `${bmFirefoxPath[0]}\\${folder}\\${bmFirefoxPath[2]}`;
				if (debug) console.log(`Checking path: ${tmp}`);
				return fs.existsSync(tmp);
			});
			if (debug) console.log(`Checking paths (output): ${JSON.stringify(validFolders)}`);
			if (validFolders.length == 1) {
				sqlitepath = `${bmFirefoxPath[0]}\\${validFolders[0]}\\${bmFirefoxPath[2]}`;
				if (debug) Colors.debug(`[Firefox Bookmarks][OK]: Full bookmars path: ${sqlitepath}`);
			} else {
				var msg = "[Firefox Bookmarks][ERROR]: Multiple profiles for Firefox found";
				reportErrorMessage(msg);
				return;
			}

			// Execute sqlite3 to get data
			var cmd = "";
			cmd += "sqlite3 -header -line ";
			cmd += '"' + sqlitepath + '" ';
			cmd += '"SELECT b.id, b.parent, b.title as bTitle, p.title as pTitle, p.url FROM moz_bookmarks AS b LEFT JOIN moz_places AS p ON b.fk = p.id"';
			cmd += "> " + bmTempFFLinePath;
			if (this.config.verbose) Colors.debug("Execting command: " + cmd);

			var process = exec(cmd, (error, stdout, stderr) => {
				if (error) reportErrorMessage(error);

				// Add one more line
				fs.appendFileSync(bmTempFFLinePath, "\r\n");

				// Process results
				var lineReader = require("readline").createInterface({
					input: require("fs").createReadStream(bmTempFFLinePath)
				});

				lineReader.on("line", (line) => {
					if (line == "") {
						if (record.bTitle == "toolbar") {
							record.bTitle = "BAR";
						}
						if (tmp.TitlesByRow[record.id]) {
							reportErrorMessage("Searching for Firefox bookmars: *" + record.id + "* was already defined");
						} else {
							tmp.TitlesByRow[record.id] = "";
						}
						if (record.url) {
							tmp.URLs[record.id] = record.url;
						}
						if (record.bTitle) {
							var title = "";
							if (record.parent) {
								title = tmp.TitlesByRow[record.parent];
							}
							title += "[" + record.bTitle + "]";
							if (tmp.TitlesByName[title]) {
								reportErrorMessage("Searching for Firefox bookmars: Duplicate record: [" + record.bTitle + "]");
							}
							tmp.TitlesByRow[record.id] = title;
							tmp.TitlesByName[title] = record.id;
						}

						record = {};
					} else {
						var parts = line.split("=");
						record[parts[0].trim()] = parts[1].trim();
					}
				});

				lineReader.on("close", () => {
					// Merge the data
					for (var path in tmp.TitlesByName) {
						if (path.startsWith("[BAR]")) {
							if (tmp.TitlesByName.hasOwnProperty(path)) {
								var rowId = tmp.TitlesByName[path];
								var url = tmp.URLs[rowId];
								if (url) {
									var barNode = this.bm.Bar[path];
									if (!barNode) barNode = {};
									barNode.FF = url;
									this.bm.Bar[path] = barNode;

									this.bm.FF[path] = url;
								}
							}
						}
					}

					// Check this.bm.Bar
					var bmBarNew = [];
					var bmCounter = 0;
					var bmBarTemp = this.bm.Bar;

					for (var path in bmBarTemp) {
						if (bmBarTemp.hasOwnProperty(path)) {
							var nodeNew = {};
							var nodeTemp = bmBarTemp[path];
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

					// Write to files
					fs.writeFile(
						bmDumpPath,
						JSON.stringify(
							{
								DTTM: new Date().toJSON(),
								bm: this.bm.Bar
							},
							null,
							4
						),
						(err) => {
							if (err) {
								reportErrorMessage("Searching for Firefox bookmars");
								reportErrorMessage(err);
							}

							if (debug) Colors.info("The file [" + bmDumpPath + "] was saved!");
						}
					);

					fs.writeFile(bmPretendPath, JSON.stringify(bm, null, 4), (err) => {
						if (err) {
							reportErrorMessage("Searching for Firefox bookmars");
							reportErrorMessage(err);
						}

						if (debug) Colors.info("The file [" + bmPretendPath + "] was saved!");
					});

					// Validate them
					validateBookmarks_Process();
				});
			});
		} catch (ex) {
			reportErrorMessage("Failed checking Firefox");
		}
	}
	validateBookmarks_Process() {
		if (this.config.verbose) Colors.info("Validating Bookmarks");

		var errorCount = 0;
		var bmChecks = loadFileJson(bmCheckPath);

		bmChecks.forEach((bmCheck) => {
			var hasErrors = false;
			var urlFF = this.bm.FF[bmCheck.title];
			var urlChrome = this.bm.Chrome[bmCheck.title];
			var expectedUrl = bmCheck.urlExpected;

			Colors.info("Bookmark: " + bmCheck.title);

			if (bmCheck.checkFF && bmCheck.checkChrome) {
				if (urlFF != urlChrome && urlFF && urlChrome) {
					errorCount++;
					hasErrors = true;
					var msg = {
						errorCode: 1,
						bmCheckId: bmCheck.id,
						errorMsg: "Urls are different for Firefox and Chrome.",
						urlTitle: bmCheck.title,
						urlFirefox: urlFF,
						urlChrome: urlChrome
					};
					reportErrorMessage(msg);
				}
			}

			if (bmCheck.checkFF) {
				if (expectedUrl !== urlFF) {
					errorCount++;
					hasErrors = true;
					var msg = {
						errorCode: 1,
						bmCheckId: bmCheck.id,
						errorMsg: "Url in Firefox is not the expected value",
						urlTitle: bmCheck.title,
						urlExpected: expectedUrl,
						urlFirefox: urlFF
					};
					reportErrorMessage(msg);
				}
			}

			if (bmCheck.checkChrome) {
				if (expectedUrl !== urlChrome) {
					errorCount++;
					hasErrors = true;
					var msg = {
						errorCode: 3,
						bmCheckId: bmCheck.id,
						errorMsg: "Url in Chrome is not the expected value",
						urlTitle: bmCheck.title,
						urlExpected: expectedUrl,
						urlChrome: urlChrome
					};
					reportErrorMessage(msg);
				}
			}

			if (!hasErrors) {
				openUrl(expectedUrl, (isSuccess, error) => {
					if (!isSuccess) {
						errorCount++;
						hasErrors = true;
						var msg = {
							errorCode: 4,
							bmCheckId: bmCheck.id,
							errorMsg: "Url can't be accessed",
							urlTitle: bmCheck.title,
							urlExpected: expectedUrl
						};
						reportErrorMessage(msg);
					} else {
						if (this.config.verbose) Colors.success("VALID: Bookmark *" + bmCheck.title + "*, URL [" + expectedUrl + "]");
					}
				});
			}
		});

		nextInstruction();
	}
	validateBookmarks() {
		if (this.config.verbose) Colors.info("Validating all bookmarks for all browsers");

		if (doesFileExist(bmPretendPath)) {
			Colors.error("Bookmarks information read from file [" + bmPretendPath + "]");
			bm = loadFileJson(bmPretendPath);
			validateBookmarks_Process();
		} else {
			// validateBookmarks_Process is not called from here directly because it is going to work asynchronously... invoked from findBookmarks_Firefox.
			// Do not reverse the order here. First Chrome, then Firefox.
			findBookmarks_Chrome();
			findBookmarks_Firefox(); // Firefox must be last!
		}
	}
}
