import fetch from "node-fetch";

async function run() {
  const url = "https://comunicaapi.pje.jus.br/swagger/v1/swagger.json";
  try {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7"
      }
    });
    console.log(`Status: ${res.status}`);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log("Body excerpt:", body.substring(0, 1000));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

run();
