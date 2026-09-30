const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
const users = {}; // Stores: { email: { name, passwordHash, balance, completedTasks: [] } }
let activeSessions = {}; // Stores logged-in tokens: { token: email }
// Storage arrays for submitted requests
let depositRequests = [];
let withdrawalRequests = [];
// Bank Details for Deposits
const depositBankInfo = {
  bankName: "Zenith Bank",
  accountNumber: "2124089497",
  accountName: "Prince Chukwuemeka Nnadi"
};

const tasks = [
  { id: 1, title: "Watch Short Ad", reward: 1000 },
  { id: 2, title: "Complete Quick Poll", reward: 5000 },
  { id: 3, title: "Test New Feature", reward: 10000 }
];

// Helper middleware to verify user session
function authenticate(req, res, next) {
  const token = req.headers['authorization'];
  if (!token || !activeSessions[token]) {
    return res.status(401).json({ error: "Please log in to continue." });
  }
  req.userEmail = activeSessions[token];
  next();
}

// 1. REGISTER
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const cleanEmail = email.toLowerCase().trim();
  if (users[cleanEmail]) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users[cleanEmail] = {
    name,
    email: cleanEmail,
    passwordHash: hashedPassword,
    balance: 0.00,
    completedTasks: []
  };

  res.json({ message: "Account created successfully! You can now log in." });
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please provide both email and password." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = users[cleanEmail];

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  const token = `token_${Date.now()}_${Math.random()}`;
  activeSessions[token] = cleanEmail;

  res.json({
    message: `Welcome back, ${user.name}!`,
    token,
    user: { name: user.name, email: user.email }
  });
});

// 3. LOGOUT
app.post('/api/logout', authenticate, (req, res) => {
  const token = req.headers['authorization'];
  delete activeSessions[token];
  res.json({ message: "Logged out successfully." });
});

// 4. GET DASHBOARD DATA
app.get('/api/wallet', authenticate, (req, res) => {
  const user = users[req.userEmail];

  const taskData = tasks.map(t => ({
    ...t,
    isCompleted: user.completedTasks.includes(t.id)
  }));

  res.json({
    userName: user.name,
    balance: user.balance,
    tasks: taskData,
    depositInfo: depositBankInfo
  });
});

// 5. PERFORM TASK
app.post('/api/perform-task', authenticate, (req, res) => {
  const user = users[req.userEmail];
  const { taskId } = req.body;
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  if (user.completedTasks.includes(taskId)) {
    return res.status(400).json({ error: "Task already completed." });
  }

  user.balance += task.reward;
  user.completedTasks.push(taskId);

  res.json({
    message: `Earned ₦${task.reward.toFixed(2)}!`,
    balance: user.balance
  });
});

// 6. DEPOSIT NOTIFICATION
app.post('/api/deposit-notify', authenticate, (req, res) => {
  const user = users[req.userEmail];
  const { amount, senderName } = req.body;
  const depositAmount = parseFloat(amount);

  if (isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({ error: "Invalid deposit amount." });
  }

  if (!senderName) {
    return res.status(400).json({ error: "Sender name is required." });
  }

  user.balance += depositAmount;
  // Log details to your VS Code terminal
  console.log(\n--- NEW DEPOSIT NOTIFICATION ---);
  console.log(User: ${user.name} (${user.email}));
  console.log(Sender Name: ${senderName});
  console.log(Amount Transferred: ₦${depositAmount});
  console.log(--------------------------------\n);
  res.json({
    message: `Deposit of ₦${depositAmount.toFixed(2)} received from ${senderName}.`,
    balance: user.balance
  });
});
// 7. WITHDRAW
app.post('/api/withdraw', authenticate, (req, res) => {
  const user = users[req.userEmail];
  const { amount, accountNumber, bankName } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount entered." });
  }
  if (withdrawAmount > user.balance) {
    return res.status(400).json({ error: "Insufficient account balance." });
  }
   if (!accountNumber || !bankName) {
    return res.status(400).json({ error: "Bank name and account number are required." });
  }
  user.balance -= withdrawAmount;
// Save withdrawal record
  withdrawalRequests.push({
    id: withdrawalRequests.length + 1,
    userName: user.name,
    userEmail: user.email,
    bankName,
    accountNumber,
    amount: withdrawAmount,
    time: new Date().toLocaleString()
  });

  console.log(NEW WITHDRAWAL: ₦${withdrawAmount} to ${bankName} (${accountNumber}) by ${user.email});
  res.json({
    message: "Withdrawal request submitted successfully.",
    balance: user.balance
  });
});
// 8. ADMIN VIEW (TO GET ALL REQUESTS)
app.get('/api/admin/requests', (req, res) => {
  res.json({
    totalDeposits: depositRequests.length,
    totalWithdrawals: withdrawalRequests.length,
    deposits: depositRequests,
    withdrawals: withdrawalRequests
  });
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
