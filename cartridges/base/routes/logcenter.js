module.exports = {
    // Note: Don't use '_' in names of LiteQL variables
    // If you have debug logs use debugLogs, not debug_logs
    // LiteQL interprets '_' as a function

    // TODO: Add file's page in which you can see the logs
    index : (scope)=>{
        return scope.$.call([
            {"!base_template":["logcenter/index", {}]}
        ]);
    },
    debug : (scope)=>{
        return scope.$.call([
            {"logs_list>debugLogs":["debug"]},
            {"!base_template":["logcenter/logs", "_debugLogs"]}
        ]);
    },
    warn : (scope)=>{
        return scope.$.call([
            {"logs_list>warnLogs":["warn"]},
            {"!base_template":["logcenter/logs", "_warnLogs"]}
        ]);
    },
    error : (scope)=>{
        return scope.$.call([
            {"logs_list>errorLogs":["error"]},
            {"!base_template":["logcenter/logs", "_errorLogs"]}
        ]);
    },
    fatal : (scope)=>{
        return scope.$.call([
            {"logs_list>fatalLogs":["fatal"]},
            {"!base_template":["logcenter/logs", "_fatalLogs"]}
        ]);
    },
    all : (scope)=>{
        return scope.$.call([
            {"logs_list>allLogs":[]},
            {"!base_template":["logcenter/logs", "_allLogs"]}
        ]);
    },
    logs : (scope)=>{
        let filename = scope.req.query.file;

        let file = require(APP_ROOT + "/cartridges/base/resources/logs.js").file(filename);

        // require(APP_ROOT+"/modules/app")('logger').debug("file from logs: " + JSON.stringify(file) + " and filename: " + filename);

        return require(APP_ROOT + "/cartridges/base/resources/base.js").template("logcenter/log", file);

        // This part of code is good, but it's time to shine has yet to come
        // (Awaiting bug fix in LiteQL)
        // return scope.$.call([
        //     {"logs_file>file":[filename]},
        //     {"!base_template":["logcenter/log", "_file"]}
        // ]);
    }
}