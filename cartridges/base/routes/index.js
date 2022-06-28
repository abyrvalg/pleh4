$ = require('liteql');

module.exports = {
	index : (scope)=>{
        return scope.res.redirect(scope.session.getVar("currentProfile") ? "user/index" : "/user/login");
	}
}