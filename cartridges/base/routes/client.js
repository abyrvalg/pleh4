

module.exports = {
    list : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return scope.res.redirect("/user/login");
        }
        return scope.$.call([
            {"client_getMyCleints>clients" : []},
            {"!base_template":["myClients", {clients : "_clients"}]}
        ]);
    },
    view : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return scope.res.redirect("/user/login");
        }
        return scope.$.call([
            {"client_getMyClientCard>card" : [scope.req.query.id]},
            {"!base_template":["clientCard", "_card"]}
        ]);
    }
}