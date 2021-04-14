const pageName = $("#pageName")[0].outerText;
var navbar = $(".nav-bar");

switch (pageName) {
  case "DEBUG":
    navbar.addClass("bg-primary");
    break;
  case "WARN":
    navbar.addClass("bg-warning");
    $("nav.nav-bar .logo").addClass("text-dark");
    $("nav.nav-bar .nav-link").addClass("text-dark");
    // $(".nav-link").forEach((item, index, arr)=>{
    //   item.addClass("text-dark");
    // });
    break;
  case "ERROR":
    navbar.addClass("bg-danger");
    break;
  case "FATAL":
    navbar.addClass("bg-dark");
    break;
  default:
    navbar.addClass("bg-success");
}
