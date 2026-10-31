const origin = process.env.FL_LOCAL_ORIGIN || "http://127.0.0.1:3031";
const expectations = new Map([
  ["/", 200], ["/bags-all", 200], ["/bags-all?page=99&limit=25", 307],
  ["/accordo-hobo-45773", 200], ["/careers", 200], ["/brands", 200],
  ["/brand-adidas", 200], ["/special", 200], ["/search?q=dress", 200],
  ["/account/login", 200], ["/login.html", 302], ["/wishlist.html", 302],
  ["/index.php?route=product/category&path=999", 404], ["/not-a-real-page", 404],
  ["/about-us.html", 308],
]);
let bad = 0;
for (const [path, expected] of expectations) {
  const response = await fetch(origin + path, { redirect: "manual" });
  const target = response.headers.get("location") || "";
  const pass = response.status === expected;
  if (!pass) bad++;
  console.log(`${pass ? "OK " : "ERR"} ${response.status} ${path} ${target}`);
}
if (bad) process.exitCode = 1;
