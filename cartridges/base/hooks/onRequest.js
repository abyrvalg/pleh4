module.exports = (req, res, next)=>{
    if(req.protocol == "http" && process.env.instance === "prod") {
        res.redirect("https://"+ req.get('host') + req.originalUrl);
    } else {
        next();
    }
}