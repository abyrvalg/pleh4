

module.exports = {
    index : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return scope.res.redirect("/user/login");
        }
        return scope.$.call([
            {"therapyTest_getTestList>tests" : []},
            {"!base_template":["therapyTests", "_tests"]}
        ]);
    }
}