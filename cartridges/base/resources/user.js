const  amplify = require('aws-amplify');
const dataUtils = require(APP_ROOT+"/modules/app")("utils", "data");
const LOGGER = require(APP_ROOT+"/modules/app")('logger');

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
        return this.scope.$.call({"!storage_getUserData" : [{fields : ["id"], email : arg.email}]}).then(user=>{
            if(!user || !user.id){
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
        var $ = this.scope.$;
        return amplify.Auth.signIn(arg.email, arg.password).then(awsRes=>{
            return $.call({"!storage_getUserData" : [{
                email : arg.email,
                rolesFields : true,
                fields : ['id', 'firstName', 'lastName', 'tgId', {'roles' : ['num', 'name']}, {'permissions' : ['name', 'num', 'route']}]
            }]}).then(userData=>{
                if(userData.id) {
                    var userID = userData.id,
                        roles = userData.roles,
                        permissions = userData.permissions
                    session.setVar("currentProfile", {
                        id : userID,
                        email : awsRes.attributes.email,
                        first_name : awsRes.attributes["given_name"],
                        last_name : awsRes.attributes["family_name"],
                        roles : roles || [],
                        permissions : permissions || []
                    });
                    return {success : true};
                }
                var query = [{"storage_createUser>createUserResult" : [{
                        email : arg.email, 
                        firstName : awsRes.attributes["given_name"],
                        lastName : awsRes.attributes["family_name"],
                        role : (arg.isClient ? 'client' : '')
                    }]}];
                if(arg.isClient) {
                    query.push({"storage_addClient" : [{
                        name : awsRes.attributes["given_name"],
                        phone : arg.phone,
                        userID : "_createUserResult.id"
                    }]});                    
                }
                query.push({"storage_getUserData>userData" : [{
                    email : arg.email,
                    rolesFields : true,
                    fields : ['id', 'firstName', 'lastName', 'tgId', {'roles' : ['num', 'name']}, {'permissions' : ['name', 'num', 'route']}]
                }]})
                return $.call(query).then(r=>{
                    session.setVar("currentProfile", {
                        id : r.userData.id,
                        email : awsRes.attributes.email,
                        first_name : awsRes.attributes["given_name"],
                        last_name : awsRes.attributes["family_name"],
                        roles : r.userData.roles,
                        permissions : r.userData.permissions
                    });                  
                    return {success : true}
                }).catch(err=>{
                    LOGGER.error(err);
                    return {success: false}
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
        var username = this.scope.session.getVar("email") || arg.email;
        if(!arg || !arg.code || !username) return;
        return amplify.Auth.confirmSignUp(username, arg.code).then(resp=>{
           return {success:true}
        }).catch(err=>{
            return {success : false, error:"aws", details : err}
        });
    },
    sendConfirm(arg){
        var username = this.scope.session.getVar("email") || arg.email;
        if(!username) return {success : false, error : "no_user_name"};
        return amplify.Auth.resendSignUp(username).then(resp=>{
            return {success : true}
        }).catch(err=>{
            return {success : false, error:"aws", details : err}
        });
    },
    getRolesNames(arg) {
        var profile = this.scope.session.getVar("currentProfile");
        if(!profile) return {succsess : false, error: "not_authorized"}
        return profile.roles.map(role=>role.name);
    },
    getDashboard(){
        var profile = this.scope.session.getVar("currentProfile"),
            local = this.scope['locale'];
        if(!profile) return {success : false, error: "not_authorized"};
        if(!profile.permissions) return [];
        var structurred = [],
        processed = {};
        profile.permissions.forEach(el=>{
            if(el.name && ~el.name.indexOf(".")){
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
    },
    getSID() {
        return this.scope.session.getSID();
    },
    getCurrentClientID(){
        var session = this.scope.session;
        if(!session.ensure("auth")){
            return {success: false, error: "not_available"}
        }
        var clientID = session.getVar("clientID");
        if(clientID) {
            return Promise.resolve(clientID);
        }
        var profile = session.getVar("currentProfile"),
            userID = profile && profile.id;
        return this.scope.$.call({"!storage_getClient" : [{
            fields : ["id"], 
            userID : userID
        }]}).then(r=> r && (session.setVar("clientID", r.id), r.id));

    }
}