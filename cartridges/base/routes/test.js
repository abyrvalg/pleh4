

module.exports = {
    index : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return Promise.resolve({
                status : 'redirect', 
                path : "/user/login"
            });
        }
        return scope.$.call([
            {"therapyTest_getTestList>tests" : []},
            {"!base_template":["therapyTests", "_tests"]}
        ]);
    }
}