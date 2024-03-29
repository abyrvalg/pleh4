

module.exports = {
    head : (scope)=>{
        return scope.$.call([
            {"user_getDashboard>dachboard":[]},
            {"user_isAuthorized>isAuthorized":[]},
            {"base_msg>msg": ["head", ["\\w\*"]]},
            {"!base_template":["parts/head", {
                "dachboard" : "_dachboard",
                "isAuthorized" : "_isAuthorized",
                "msg" : "_msg"
            }]}
        ]);
    },
    logCenterHead : (scope) =>{
        return scope.$.call([
            {"!base_template": ["logcenter/parts/head"]}
        ]);
    },
    htmlHead : (scope)=>{

    }
}