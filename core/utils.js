module.exports = {
	isClient(){
		return typeof window != "undefined";
	},
	isServer(){
		return !this.isClient();
	}
}