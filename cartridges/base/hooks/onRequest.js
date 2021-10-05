module.exports = (req, res, next)=>{
    if(req.protocol == "http" && process.env.instance !== "localhost") {
        console.log(req.protocol);
        res.redirect("https://"+ req.get('host') + req.originalUrl);
    } else {
        next();
    }
}