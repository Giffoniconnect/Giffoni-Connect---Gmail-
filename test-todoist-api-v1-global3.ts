const token = process.env.TODOIST_API_KEY;
fetch("https://api.todoist.com/api/v1/tasks", {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.json())
.then(d => console.log(Object.keys(d), Array.isArray(d)))
.catch(console.error);
