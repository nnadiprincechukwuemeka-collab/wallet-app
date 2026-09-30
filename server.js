const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
let userAccount = { balance: 0.00,completedTasks: []};
const tasks = [
  { id: 1, title: "Watch Short Ad", reward: 2.50 },
  { id: 2, title: "Complete Quick Poll", reward: 5.00 },
  { id: 3, title: "Test New Feature", reward: 10.00 }
];
app.get('/api/wallet', (req, res) => {
  const taskData = tasks.map(t => ({
    ...t,
    isCompleted: userAccount.completedTasks.includes(t.id)
  }));

  res.json({
    balance: userAccount.balance,
    tasks: taskData
  });
});

app.post('/api/perform-task', (req, res) => {
  const { taskId } = req.body;
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  if (userAccount.completedTasks.includes(taskId)) {
    return res.status(400).json({ error: "Task already completed." });
  }

  userAccount.balance += task.reward;
  userAccount.completedTasks.push(taskId);

  res.json({ message: "Task completed successfully.", balance: userAccount.balance });
}); 
app.post('/api/withdraw', (req, res) => {
  const { amount, accountNumber, bankName } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount entered." });
  }

  if (withdrawAmount > userAccount.balance) {
    return res.status(400).json({ error: "Insufficient account balance." });
  }

  if (!accountNumber || !bankName) {
    return res.status(400).json({ error: "Bank name and account number are required." });
  }

  userAccount.balance -= withdrawAmount;

  res.json({
    message: "Withdrawal successful.",
    balance: userAccount.balance
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});