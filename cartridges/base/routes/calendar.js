module.exports = {
	setSchedule : (scope)=>{
		return require(APP_ROOT+"/modules/app")("model").get("Therapist", scope.req.query.id, scope.session).then(therapist=>{
			return scope.session.getVar("liteql").call({"!base_template":["setSchedule", therapist.obj]});
		});
	}
}