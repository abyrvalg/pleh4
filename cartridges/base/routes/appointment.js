module.exports = {
	list : (scope)=>{
        return scope.session.getVar("liteql").call([
            {"storage_appointments>appointments" : [scope.req.query.therapist]},
            {"!base_template" : ["appointmentList", "_appointments"]}
        ])
    }
}