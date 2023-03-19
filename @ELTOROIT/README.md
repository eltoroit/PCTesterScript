```
config = {
    errors: [],
    debug: false,
    verbose: false,
    resultsTofile: true,
    checkUrlExists: true,
    executeManualChecks: true,
    adminUser: "Administrator",
};
```

`SELECT Operation__c, count(id) FROM etcTest__c GROUP BY Operation__c ORDER BY Operation__c`

| Operation          | count | What does it do?                                                          |
| ------------------ | ----- | ------------------------------------------------------------------------- |
| Bookmark           | 1     | Checks bookmarks on FireFox and Chrome                                    |
| Execute            | 17    | Execute application and validate expected results                         |
| Check Path         | 29    | Validate a file does exist in the expected path                           |
| Clear              | 1     | Clear the screen                                                          |
| JSON               | 2     | Validate JSON, and replace value if it's different                        |
| Manual             | 3     | Ask user to manually check and determine if the test pass                 |
| Manual Application | 11    | Open application and ask user if it did open (Previous: Open Application) |
| Write              | 3     | Write messages using console.log()                                        |

`SELECT Parent__r.Name, Code__c, AppName__c, Operation__c, Command__c, Expected__c, IsActive__c FROM etcTest__c ORDER BY Code__c`
