const dateUtils = {
    getYearMonth : date=>(+((date.getYear() - 100)+(date.getMonth() < 9 ? "0" : "")+(date.getMonth()))),
    getDateFromYearMonth : (yearMonth, isEnd)=>{       
        yearMonth = ""+(yearMonth+1);        
        var date = new Date("20"+yearMonth.substr(0,2)+"-"+yearMonth.substr(2,2)+"-01T00:00:00");
        if(isEnd){
            date.setMonth(date.getMonth()+1);
            date.setDate(date.getDate()-1);
        }
        return date;
    },
    getNumFromDateTime : (date, time)=>{
        return (date.getDate()-1)*24+time;
    },
    substractDateTimeFromSchedule : (schedule, date, time) => {
        return schedule - BigInt(Math.pow(2, dateUtils.getNumFromDateTime(date, time)));
    }
}
module.exports = dateUtils;