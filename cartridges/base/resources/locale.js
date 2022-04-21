
module.exports = {
    getAll() {
        return this.scope.$.call({'!storage_getAllLocales' : []})
    }
}