window.onload = function(){
    function slelectMonth(val){
        document.querySelectorAll(".month_sheet").forEach((month)=>{
            month.hidden = month.dataset.val != val;
        })
    };
    slelectMonth(document.querySelectorAll("#head_month")[0].value);
    document.querySelectorAll("#head_month")[0].addEventListener("change", (e)=>{
        slelectMonth(e.target.value)
    });

    document.querySelector("[name=submit_schedule]").addEventListener("click", (e)=>{
        let checked = document.querySelectorAll(".slot:checked"),
            query = {};
        checked.forEach((slot)=>{
            let month = slot.closest(".month_sheet").dataset.val;
            query[month] = query[month] || [];
            query[month].push(slot.value);
        });
        console.log(query);
    });
}