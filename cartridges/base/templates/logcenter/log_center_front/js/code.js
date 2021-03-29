var table = document.getElementById('table'),
    requestURL = '../log.json', 
    request = new XMLHttpRequest();
request.open('GET', requestURL);
request.onload = function(e) {
    if (request.readyState === 4) {
        if (request.status === 200) {
            console.log(request.response);
            var dataTable = JSON.parse(request.responseText);
            getTableInfo(dataTable);
        } else {
            console.error(request.statusText);
        }
    }
};
request.onerror = function(e) {
    console.error(request.statusText);
};
request.send();

function getTableInfo(data) {
    
    data.debug.forEach(function(elem) {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${elem.id}</td><td>${elem.date}</td>
              <td>${elem.time}</td><td>${elem.text}</td>`
        table.appendChild(tr);
    });
}