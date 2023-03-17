// Bookmarks
const bmPretendPath = "./bmPretend.json";
const bmCheckPath = "./bmCheck.json";
const bmDumpPath = "./bmDump.json";
const bmTempFFLinePath = "./bmTempFF_LINE.txt";
const bmChromePath = "C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Bookmarks";
const bmFirefoxPath = ["C:\\Users\\Administrator\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles", "*.default-release", "places.sqlite"];

export default class Bookmarks {
	bm = {};
	constructor() {
		this.bm.FF = {};
		this.bm.Bar = {};
		this.bm.Chrome = {};
	}

	openUrl(urlToCheck, callback) {
		if (checkUrlExists) {
			var process = spawnSync("curl", [urlToCheck]);
			if (verbose) log.debug(process.stderr);
			if (debug) log.debug(JSON.stringify(process.stdout.toString("utf8")).substring(0, 250));

			if (process.status == 0) {
				callback(true);
			} else {
				callback(false, "Invalid url: " + urlToCheck);
			}
		} else {
			if (debug) log.debug("URL [" + urlToCheck + "] was not validated");
			callback(true);
		}
	}
	findBookmarks_Chrome_Children(node, path) {
		var thisPath;

		if (node.name == "Bookmarks bar") {
			thisPath = "[BAR]";
		} else {
			thisPath = path + "[" + node.name + "]";
		}
		if (node.url) {
			var barNode = bm.Bar[thisPath];
			if (!barNode) barNode = {};
			barNode.Chrome = node.url;
			bm.Bar[thisPath] = barNode;
			bm.Chrome[thisPath] = node.url;
		}
		if (node.children) {
			for (var i = 0; i < node.children.length; i++) {
				findBookmarks_Chrome_Children(node.children[i], thisPath);
			}
		}
	}
	findBookmarks_Chrome() {
		if (verbose) log.info("Finding Chrome bookmarks");

		var data = loadFileJson(bmChromePath);
		findBookmarks_Chrome_Children(data["roots"]["bookmark_bar"], "");
		// if (verbose) log.debug("Chrome Bookmarks (1): ");
		// if (verbose) log.debug(JSON.stringify(bm, null, 4));
	}
	findBookmarks_Firefox() {
		if (verbose) log.info("Finding Firefox bookmarks");

		var tmp = {};
		var record = {};
		var sqlitepath = "";

		tmp.TitlesByRow = {};
		tmp.TitlesByName = {};
		tmp.URLs = {};

		// Find sqlite path
		if (debug) log.debug(`[Firefox Bookmarks][LOLG]: Searching for Firefox bookmars at path: ${bmFirefoxPath[0]}`);
		try {
			var folders = fs.readdirSync(bmFirefoxPath[0]);
			if (debug) log.debug(`[Firefox Bookmarks][LOLG]: Foders found: ${JSON.stringify(folders)}: `);
			let validFolders = folders.filter((folder) => {
				let tmp = `${bmFirefoxPath[0]}\\${folder}\\${bmFirefoxPath[2]}`;
				if (debug) console.log(`Checking path: ${tmp}`);
				return fs.existsSync(tmp);
			});
			if (debug) console.log(`Checking paths (output): ${JSON.stringify(validFolders)}`);
			if (validFolders.length == 1) {
				sqlitepath = `${bmFirefoxPath[0]}\\${validFolders[0]}\\${bmFirefoxPath[2]}`;
				if (debug) log.debug(`[Firefox Bookmarks][OK]: Full bookmars path: ${sqlitepath}`);
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
			if (verbose) log.debug("Execting command: " + cmd);

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
					// if (verbose) log.debug("Firefox Bookmarks... (2): ");
					// if (verbose) log.debug(JSON.stringify(tmp, null, 4));

					// Merge the data
					for (var path in tmp.TitlesByName) {
						if (path.startsWith("[BAR]")) {
							if (tmp.TitlesByName.hasOwnProperty(path)) {
								var rowId = tmp.TitlesByName[path];
								var url = tmp.URLs[rowId];
								if (url) {
									var barNode = bm.Bar[path];
									if (!barNode) barNode = {};
									barNode.FF = url;
									bm.Bar[path] = barNode;

									bm.FF[path] = url;
								}
							}
						}
					}

					// if (verbose) log.debug("Merged Bookmarks (A)... (3): ");
					// if (verbose) log.debug(JSON.stringify(bm, null, 4));

					// Check bm.Bar
					var bmBarNew = [];
					var bmCounter = 0;
					var bmBarTemp = bm.Bar;

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
					bm.Bar = bmBarNew;

					// if (verbose) log.debug("Merged Bookmarks (B)... (4): ");
					// if (verbose) log.debug(JSON.stringify(bm, null, 4));

					// Write to files
					fs.writeFile(
						bmDumpPath,
						JSON.stringify(
							{
								DTTM: new Date().toJSON(),
								bm: bm.Bar
							},
							null,
							4
						),
						(err) => {
							if (err) {
								reportErrorMessage("Searching for Firefox bookmars");
								reportErrorMessage(err);
							}

							if (debug) log.info("The file [" + bmDumpPath + "] was saved!");
						}
					);

					fs.writeFile(bmPretendPath, JSON.stringify(bm, null, 4), (err) => {
						if (err) {
							reportErrorMessage("Searching for Firefox bookmars");
							reportErrorMessage(err);
						}

						if (debug) log.info("The file [" + bmPretendPath + "] was saved!");
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
		if (verbose) log.info("Validating Bookmarks");

		var errorCount = 0;
		var bmChecks = loadFileJson(bmCheckPath);

		bmChecks.forEach((bmCheck) => {
			var hasErrors = false;
			var urlFF = bm.FF[bmCheck.title];
			var urlChrome = bm.Chrome[bmCheck.title];
			var expectedUrl = bmCheck.urlExpected;

			log.info("Bookmark: " + bmCheck.title);

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
						if (verbose) log.success("VALID: Bookmark *" + bmCheck.title + "*, URL [" + expectedUrl + "]");
					}
				});
			}
		});

		nextInstruction();
	}
	validateBookmarks(instruction) {
		if (verbose) log.info("Validating all bookmarks for all browsers");

		if (doesFileExist(bmPretendPath)) {
			log.error("Bookmarks information read from file [" + bmPretendPath + "]");
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
