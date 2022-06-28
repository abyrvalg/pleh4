(()=>{
    var changeList = {}
    document.querySelector(".user_table").addEventListener("change", e=>{
        if(e.target.type == "checkbox"){
            let userId = e.target.dataset.userid,
                roleId = e.target.dataset.roleid;
            changeList[userId] = changeList[userId] || e.target.closest(".user_row").dataset.roles;
            changeList[userId] = changeList[userId] == "null" ? 0 : (+changeList[userId]);
            changeList[userId] = changeList[userId] + (e.target.dataset.rolenum * (e.target.checked ? 1 :-1));
        }
    })
    document.querySelector("input[name=save]").addEventListener("click", e=>{
        fetch("/ua/data", {
            method : 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                "!user_updateUsersRoles" : [changeList]
            })
        }).then(r=>{
            r.json().then(json=>{
                if(json.success) {
                    alert("saved!");
                }
                else {
                    alert("something's wrong");
                }
            })
        });
    })
})(); 