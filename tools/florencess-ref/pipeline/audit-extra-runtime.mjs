const origin = process.env.FL_LOCAL_ORIGIN || "http://127.0.0.1:3031";
const checks = [
  {path:"/not-a-real-page",status:404,body:/not found|page could not be found|404/i},
  {path:"/index.php?route=product/category&path=999",status:404,body:/404|not found/i},
  {path:"/bags-all?page=99&limit=25",status:307,location:/\/bags-all\?page=9&limit=25/},
  {path:"/search?q=unfindableproductsuffix",status:200,body:/no products|no results|nothing found|not found/i},
  {path:"/account/login?returnTo=https%3A%2F%2Fexample.com",status:200,body:/Account Login/i},
  {path:"/manufacturer-108",status:200,body:/48.{0,30}captured products/i},
  {path:"/accordo-hobo-45773",status:200,body:/Show image 6 of 6/i},
  {path:"/cart",status:200,body:/cart/i},
  {path:"/checkout",status:200,body:/checkout|shopping bag|cart/i},
];
let errors=0;
for (const c of checks) {
  const response=await fetch(origin+c.path,{redirect:"manual"});
  const body=c.body?await response.text():"";
  const ok=response.status===c.status && (!c.location||c.location.test(response.headers.get("location")||"")) && (!c.body||c.body.test(body));
  if(!ok)errors++;
  console.log(`${ok?"OK":"ERR"} ${response.status} ${c.path} ${response.headers.get("location")||""}`);
}
if(errors)process.exitCode=1;
