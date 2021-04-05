module.exports = {
    // Note: Don't use '_' in names of LiteQL variables
    // If you have debug logs use debugLogs, not debug_logs
    // LiteQL interprets '_' as a part of object (method or parameter)


    // TODO: Add a way to add text onto template "files" to distinguish
    // the page's log type (i.e. title of page should say "debug logs")

    // TODO: Add file's page in which you can see the logs
    index : (scope)=>{
        return scope.$.call([
            {"!base_template":["logcenter/index", {}]}
        ]);
    },
    debug : (scope)=>{
        return scope.$.call([
            {"logs_debugList>debugLogs":[]},
            {"!base_template":["logcenter/files", "_debugLogs"]}
        ]);
    },
    warn : (scope)=>{
        return scope.$.call([
            {"logs_warnList>warnLogs":[]},
            {"!base_template":["logcenter/files", "_warnLogs"]}
        ]);
    },
    error : (scope)=>{
        return scope.$.call([
            {"logs_errorList>errorLogs":[]},
            {"!base_template":["logcenter/files", "_errorLogs"]}
        ]);
    },
    fatal : (scope)=>{
        return scope.$.call([
            {"logs_fatalList>fatalLogs":[]},
            {"!base_template":["logcenter/files", "_fatalLogs"]}
        ]);
    },
}