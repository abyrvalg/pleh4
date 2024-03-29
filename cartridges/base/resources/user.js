const  amplify = require('aws-amplify');
const STORAGE = require(APP_ROOT+"/modules/app")('storage');
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const LOGGER = require(APP_ROOT+"/modules/app")('logger');
const scheme = process.env.dbscheme;

amplify.Amplify.configure({
    Auth: {
        region: process.env.AWSregion,
        userPoolId: process.env.AWSuserPoolId,
        userPoolWebClientId : process.env.AWSuserPoolWebClientId,
        mandatorySignIn: false,
        authenticationFlowType: 'USER_PASSWORD_AUTH',
    }
});

module.exports = {
    register(arg){
        var session = this.scope.session;
        return this.scope.$.call({fields : [id], where : {
            email : arguments.email, cognito_confiemed : true
        }}).then(user=>{
            if(!user || !user.length){
                return amplify.Auth.signUp({
                    username:  arg.email,
                    password : arg.password,
                    attributes: {
                        email : arg.email,
                        "given_name" : arg.firstName,
                        "family_name" : arg.lastName
                    }
                }).then(awsResp=>{
                    session.setVar("email", arg.email);
                    return {success : true}
                }).catch(err=>{
                    LOGGER.error("error during cognito signUp: "+(err && JSON.stringify(err)));
                    return {success : false, error : "aws", msg : err.message}
                });
            }
            else {
                return {success : false, error : "user_already_exists"}
            }
        });
    },
    login(arg) {
        var session = this.scope.session;
        if(session.getVar("currentProfile")){
            return {success: false, error : "user_is_already_logged_in"};
        }
        return amplify.Auth.signIn(arg.email, arg.password).then(awsRes=>{
            return STORAGE.get({
                query : "select id, first_name, last_name, roles, tg_id, cognito_confirmed from "+scheme+".users where email = $1", 
                params : [arg.email]
            }).then(user=>{
                var user = user.length ? user[0] : null,
                    userID = user ? user.id : dataUtils.getUID(32),
                    roles = user ? user.roles : 0;
                session.setVar("currentProfile", {
                    id : userID,
                    email : awsRes.attributes.email,
                    first_name : awsRes.attributes["given_name"],
                    last_name : awsRes.attributes["family_name"],
                    roles : roles || 0
                });
                var params = dataUtils.decomposePow2(roles),
                    where = params.map((el, key)=>"num = $"+(key+1));
                return STORAGE.get({
                    query : "select id, name, permissions from "+scheme+".roles where "+where.join(" or "),
                    params : params
                }).then(roles=>{
                    var profile = session.getVar("currentProfile");
                    profile.roles = roles;
                    session.setVar("currentProfile", profile);
                    if(!user) return STORAGE.get({
                        query : "insert into "+scheme+".users (id, email, cognito_confirmed, roles, first_name, last_name) values ($1, $2, $3, $4, $5, $6)",
                        params : [userID, arg.email, true, 0, awsRes.attributes["given_name"], awsRes.attributes["family_name"]]
                    }).then(r=>{                    
                        return {success : true}
                    }).catch(err=>{
                        LOGGER.error(err);
                        return {success: false}
                    });
                    return {success : true}
                });                
                
            });
        }).catch(err=>{
            if(err.code == "UserNotConfirmedException") {
                session.setVar("email", arg.email);
                return {success : false, error : "user_not_confirm"}
            }
            if(err.code == "NotAuthorizedException"){
                return {success : false, error : "invalid_login_or_password"}
            }
            LOGGER.error("AWS cognito login error: "+JSON.stringify(err));
        });
    },
    confirmRegister(arg) {
        var username = this.scope.session.getVar("email");
        if(!arg || !arg.code || !username) return;
        return amplify.Auth.confirmSignUp(username, arg.code).then(resp=>{
           return {success:true}
        }).catch(err=>{
            return {success : false, error:"aws", details : err}
        });
    },
    sendConfirm(arg){
        var username = this.scope.session.getVar("email");
        if(!username) return {success : false, error : "no_user_name"};
        return amplify.Auth.resendSignUp(username).then(resp=>{
            return {success : true}
        }).catch(err=>{
            return {success : false, error:"aws", details : err}
        });
    },
    getRolesNames(arg) {
        var profile = this.scope.session.getVar("currentProfile");
        if(!profile) return {error: "not_authorized"}
        return profile.roles.map(role=>role.name);
    },
    getDashboard(){
        var profile = this.scope.session.getVar("currentProfile"),
            local = this.scope['locale'];
        if(!profile) return {error: "not_authorized"};
        if(!profile.roles) return [];
        var permissionsNums  = [];
        profile.roles.forEach(role=>{
            permissionsNums = permissionsNums.concat(dataUtils.decomposePow2(role.permissions));
        });
        permissionsNums = permissionsNums.filter((el, key, array)=>key == array.indexOf(el));
        var where = permissionsNums.map((el, key)=>"num = $"+(key+1));
        return STORAGE.get({
            query : "select name, route from "+scheme+".permissions where "+where.join(" or "),
            params : permissionsNums
        }).then(permissions=>{
            var structurred = [],
                processed = {};
            permissions.forEach(el=>{
                if(~el.name.indexOf(".")){
                    let splitName = el.name.split("."),
                        structuredElement = {
                            name : splitName[1], 
                            route : el.route,
                            displayName : "msg(profile_"+splitName[1]+")"
                        };
                    if(processed[splitName[0]] === undefined){
                        structurred.push({
                            topicName : "msg(profile_"+splitName[0]+")",
                            elements : [structuredElement]
                        });
                        processed[splitName[0]] = structurred.length-1;
                    }
                    else {
                        structurred[processed[splitName[0]]].elements.push(structuredElement);
                    }
                }
            });
            return  require(APP_ROOT+"/modules/app")('configUtil').localizeObj(structurred, local);
        });
    },
    isAuthorized(){
        return !!this.scope.session.getVar("currentProfile");
    },
    logout(){
        this.scope.session.setVar("currentProfile", null);
        return {success:true}
    },
    updateUsersRoles(query){
        return this.scope.$.call([
            {"storage_updateRoles" : query},
            {"storage_createTherapists" : []}
        ]).then((r)=>{
            return {success : true}
        });
    }
}