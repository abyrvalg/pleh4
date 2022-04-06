

module.exports = {
     users : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return Promise.resolve({
                status : 'redirect', 
                path : "/user/login"
            });
        }
        return scope.$.call([
            {"storage_getUsers>users":[]},
            {"storage_getRoles>roles": []},
            {"!base_template":["userManagement", {users:"_users", roles:"_roles"}]}
        ]);
    }
}