var LiteQL = require('liteql');
window.sqrl = require('squirrelly');
window.liteQL = new LiteQL();
var url = "/data";
window.liteQL.addResources({
    __delegate__(query){
        return fetch(url, {
            method : "POST",
            headers : {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify(query)
        }).then(resp=>{
            return resp && resp.json();
        });
    }
});
window.onload = ()=>{
	var loadedComponenets = [];
	document.querySelectorAll("[data-component]").forEach((element)=>{
		if(!~loadedComponenets.indexOf(element.dataset.component)) {
			let scriptElement = document.createElement("script");
			scriptElement.setAttribute("src", "/js/"+element.dataset.component+".js");
			document.querySelector("body").appendChild(scriptElement);
		}
	});
}

