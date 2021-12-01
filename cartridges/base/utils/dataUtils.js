const dataUtils = {
    getUID(length, options) {
        var text = "",
            possible = options && options.lowercase ? "abcdefghijklmnopqrstuvwxyz0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    },
    decomposePow2(num){
        var result = [];
        for(let i = 0; Math.pow(2, i)<=num; i++){
            let pow2 = Math.pow(2, i);
            Math.floor(num/pow2) % 2 && result.push(pow2);
        }
        return result;
    },
    isElementinBinSet(el, set){
        return Math.floor(set/el) % 2;
    },
    cammelCaseToUnderscore(str) {
        return str.replace(/[A-Z]/g, m=>"_"+m.toLowerCase())
    }
}
module.exports = dataUtils;