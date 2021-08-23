

module.exports = {
    callback : (scope)=>{
        console.log(scope.req.body);
        return "WAT";
    }
}