const token = process.env.TODOIST_API_KEY;
fetch("https://api.todoist.com/rest/v2/tasks", {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.status)
.then(console.log)
.catch(console.error);
