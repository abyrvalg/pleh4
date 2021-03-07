

module.exports = {
    register : (scope)=>{
        return scope.session.getVar("liteql").call({"!base_template":["register"]});
    },
    login : (scope)=>{
        return scope.session.getVar("liteql").call({"!base_template":["login"]});
    },
    confirm : (scope)=>{
        return scope.session.getVar("liteql").call({"!base_template":["confirmRegister"]});
    },
    index : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return scope.res.redirect("/user/login");
        }
        return scope.session.getVar("liteql").call([ 
            {"user_getDashboard>dashboard": []} ,
            {'!base_template' : ['userLanding', '_dashboard']}])
    }
}