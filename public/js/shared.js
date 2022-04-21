document.querySelector("body").addEventListener('click', (e)=>{
    if(!e.target.closest('#popup') && document.querySelector("#popup")){
        document.querySelector("#popup").remove();
    }
})