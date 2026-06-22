# SpendWise 💰

A personal finance tracker to log income and expenses, split bills with friends, set budget goals, and visualize your spending — built with vanilla HTML/CSS/JS on the frontend and Node.js + Express + MySQL on the backend.

---

## Features

- 🔐 User authentication (signup & login with bcrypt password hashing)
- 💸 Add income and expense entries with categories, notes, and dates
- 📊 Dashboard with charts and monthly summaries
- ✂️ Split expenses with friends and groups
- 🎯 Budget goals tracking
- 💡 Spending insights
- 💾 Dual storage — MySQL database + localStorage fallback

---

## Tech Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Frontend  | HTML, CSS, JavaScript         |
| Backend   | Node.js, Express.js           |
| Database  | MySQL                         |
| Charts    | Chart.js                      |
| Security  | bcryptjs                      |

---

## Project Structure

```
SpendWIse/
├── Backend/
│   ├── config/
│   │   └── db.js              # MySQL connection
│   ├── middleware/
│   │   └── authMiddleware.js  # Auth middleware (in progress)
│   ├── routes/
│   │   ├── auth.js            # Signup & login routes
│   │   └── expenses.js        # Expense CRUD routes
│   ├── .env                   # Environment variables    (never commit this)
│   └── server.js              # Express app entry point
├── Frontend/
│   ├── js/
│   │   └── app.js             # All frontend logic
│   ├── index.html             # Main HTML file
│   └── style.css              # Styles
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [MySQL](https://www.mysql.com/) running locally
- VS Code with [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension

---

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/spendwise.git
cd spendwise
```

### 2. Set up the database

Open your MySQL client and run:

```sql
CREATE DATABASE spendwise;

USE spendwise;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255)
);

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type ENUM('income', 'expense'),
    category VARCHAR(50),
    amount DECIMAL(10,2),
    note VARCHAR(255),
    expense_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3. Set up the backend

```bash
cd Backend
npm install
```

Copy the environment template and fill in your credentials:

```bash
cp .env.example .env
```

Open `.env` and add your MySQL password:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=spendwise
PORT=3002
```

Start the server:

```bash
node server.js
```

You should see:
```
Database Connected
Server Running
```

### 4. Run the frontend

- Open `Frontend/index.html` in VS Code
- Right-click → **Open with Live Server**
- The app opens at `http://127.0.0.1:3000`

---

## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint         | Description         | Body                          |
|--------|------------------|---------------------|-------------------------------|
| POST   | `/api/auth/signup` | Register new user  | `{ name, email, password }`   |
| POST   | `/api/auth/login`  | Login existing user | `{ email, password }`        |

### Expenses — `/api/expenses`

| Method | Endpoint                  | Description              | Body / Params              |
|--------|---------------------------|--------------------------|----------------------------|
| POST   | `/api/expenses`           | Add new entry            | `{ user_id, type, category, amount, note, expense_date }` |
| GET    | `/api/expenses/:userId`   | Get all entries for user | `userId` in URL            |
| DELETE | `/api/expenses/:id`       | Delete an entry          | `id` in URL                |

---

## Common Issues

**Port 5000 not working on Mac?**
macOS Monterey and later reserves port 5000 for AirPlay Receiver. Use port 3002 (already set in this project) or go to System Settings → General → AirDrop & Handoff → turn off AirPlay Receiver.

**"No account found" on login after signup?**
Make sure you restarted the backend after any code changes (`Ctrl+C` then `node server.js` again). Node.js does not hot-reload automatically.

**CORS error in browser?**
Make sure the backend is running (`node server.js` in the `Backend/` folder) and the fetch URLs in `app.js` point to `http://localhost:3002`.

---

## Author

Made by Vrunda Prajapati