import fetch from "node-fetch";
const token = process.env.TODOIST_API_KEY;
fetch("https://api.todoist.com/api/v1/tasks", {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.json())
.then(data => {
  console.log("Found", data.length, "tasks");
})
.catch(console.error);
