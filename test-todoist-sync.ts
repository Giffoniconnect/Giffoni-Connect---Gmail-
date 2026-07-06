const token = process.env.TODOIST_API_KEY;
fetch("https://api.todoist.com/sync/v9/sync", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ resource_types: ["projects"], sync_token: "*" })
})
.then(res => res.status)
.then(console.log)
.catch(console.error);
