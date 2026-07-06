const token = process.env.TODOIST_API_KEY;
fetch("https://api.todoist.com/api/v1/tasks", {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => {
  console.log("Status:", res.status);
  if (res.status === 200) {
    return res.json().then(d => console.log("Tasks:", d.length));
  } else {
    return res.text().then(console.log);
  }
})
.catch(console.error);
