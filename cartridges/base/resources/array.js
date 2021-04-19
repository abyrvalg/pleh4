
module.exports = {
	addToEach(array, key, value){
        return array.map(el=>{
            el[key] = value;
            return el;
        });
    }
}