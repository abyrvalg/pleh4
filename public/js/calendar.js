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
    document.querySelector(".month_sheet").addEventListener("click", e=>{
        if(e.target.classList.contains("day_colum_head")) {
            e.target.closest(".day_colum").querySelectorAll("input").forEach(el=>{
                el.checked = false;
            });
        }
    });
    document.querySelector("[name=submit_schedule]").addEventListener("click", (e)=>{
        var therapistParam = location.search.match(/therapist\=(\w+)/);
        let monthSheets = document.querySelectorAll(".month_sheet[data-val='"+document.querySelectorAll("#head_month")[0].value+"']"),
            query = {"therapists_setSchedules":{
                months : {}
            }};
        monthSheets.forEach(monthSheet=>{
            let checked = monthSheet.querySelectorAll(".slot:checked"),
                schedule = 0n;
            checked.forEach((slot)=>{
                schedule += BigInt(Math.pow(2, slot.value));
            });
            query.therapists_setSchedules.months[monthSheet.dataset.val] = schedule.toString();
        });
        fetch("/data", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(query)
        }).then(res=>{
            console.log(res);
        });
    });
} 