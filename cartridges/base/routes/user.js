

module.exports = {
    register : (scope)=>{
        return scope.$.call({"!base_template":["register", {}]});
    },
    login : (scope)=>{
        return scope.$.call({"!base_template":["login", {}]});
    },
    confirm : (scope)=>{
        return scope.$.call({"!base_template":["confirmRegister", {}]});
    },
    index : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return scope.res.redirect("/user/login");
        }
        return scope.$.call([{'!base_template' : ['userLanding', {}]}])
    }
}