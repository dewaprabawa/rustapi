async function main() {
  try {
    console.log("Logging in...");
    const loginRes = await fetch("http://localhost:3000/api/admin/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "admin@app.com",
        password: "admin123"
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Logged in successfully! Token received:", token.substring(0, 15) + "...");

    console.log("Fetching assets from API...");
    const assetsRes = await fetch("http://localhost:3000/api/admin/assets", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const assetsData = await assetsRes.json();
    console.log("API Response type:", typeof assetsData);
    console.log("Is array?", Array.isArray(assetsData));
    console.log("Response:", JSON.stringify(assetsData, null, 2));
  } catch (err) {
    console.error("Error calling API:", err.message);
  }
}
main();
