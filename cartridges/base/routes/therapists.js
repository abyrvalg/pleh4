

module.exports = {
    index : (scope)=>{
        return scope.$.call([{"therapists_list>therapists":[]}, {"!base_template":["therapistlist", "_therapists"]}]);
    }
}