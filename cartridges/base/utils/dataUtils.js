const dataUtils = {
    getUID(length) {
        var text = "",
            possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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
    }
}
module.exports = dataUtils;