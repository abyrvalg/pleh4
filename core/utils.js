module.exports = {
	isClient(){
		return typeof window != "undefined";
	},
	isServer(){
		return !this.isClient();
	},
	getUUID(length){
		var _sym = 'abcdefghijklmnopqrstuvwxyz1234567890',
		 	str = '';

		for(var i = 0; i < length; i++) {
			str += _sym[parseInt(Math.random() * (_sym.length))];
		}
		return str;
	}
}