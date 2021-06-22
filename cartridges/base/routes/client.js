

module.exports = {
    list : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return scope.res.redirect("/user/login");
        }
        return scope.$.call([
            {"client_getMyCleints>clients" : []},
            {"!base_template":["myClients", {clients : "_clients"}]}
        ]);
    }
}