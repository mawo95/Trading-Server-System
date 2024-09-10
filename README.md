# Trading Server and Discord Bot Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
   - [Login System](#login-system)
   - [Anti-Bot System](#anti-bot-system)
3. [Code Structure and Functions](#code-structure-and-functions)
   - [WebSocket Endpoints](#websocket-endpoints)
   - [HTTP Endpoints](#http-endpoints)
4. [Error Handling and Logging](#error-handling-and-logging)
5. [Cluster Management](#cluster-management)
6. [Security Measures](#security-measures)
7. [System Statistics and Monitoring](#system-statistics-and-monitoring)
8. [Utility Functions](#utility-functions)
9. [Future Enhancements](#future-enhancements)
10. [Sources and References](#sources-and-references)
11. [Discord Bot](#discord-bot)

---

## Introduction

This document provides a comprehensive overview of the trading server and its associated Discord bot. The server, built with Node.js, handles functionalities such as user authentication, account management, anti-bot protection, and system statistics. The Discord bot is designed for managing trading credentials, tracking usage stats, and controlling access to the trading system.

![Alt text](URL) ![Alt text](URL)


---

## System Architecture

### Login System

The login system ensures secure user authentication with the following steps:

1. **Authentication**: Users log in via the HTTP endpoint `/client/login`. Credentials are validated against those stored in the `accounts.json` file.
2. **Token Generation**: On successful authentication, a JWT (JSON Web Token) is generated and returned to the user for session management.
3. **Security Measures**: Lockdowns and user bans can be enforced at an administrative level.

**Example Endpoint:**

```javascript
fastify.post("/client/login", async (req, rep) => {
    // Authentication logic
});
```

### Anti-Bot System

This system protects the server from automated attacks:

1. **User-Agent Verification**: Ensures the presence of a `User-Agent` header in WebSocket connections to identify automated requests.
2. **Hash Verification**: Validates a hash to confirm requests come from legitimate clients.
3. **Rate-Limiting and Bans**: Implements rate-limiting to prevent abuse and allows user bans based on behavior.

**Example Verification:**

```javascript
const isValid = verifyHash(msg.hash, tok + "," + msg.randomString);
```

---

## Code Structure and Functions

### WebSocket Endpoints

1. **Connection and Authentication**

   Handles WebSocket connections and authentication.

   **Key Functions:**

   - `verifyHash`: Checks the validity of a hash.
   - `handleInvitesJoin`: Manages user invitations.

   **Code Snippet:**

   ```javascript
   connection.on('message', async (msg) => {
       // Process message
   });
   ```

2. **Connection Management**

   Manages connection lifecycle including disconnections and errors.

   **Key Functions:**

   - `stopInviting`: Stops invitations on connection close.
   - `handleLeave`: Processes user departures from trading queues.

   **Code Snippet:**

   ```javascript
   connection.on('close', async (reason) => {
       // Handle connection close
   });

   connection.on('error', async (err) => {
       // Handle error
   });
   ```

### HTTP Endpoints

1. **Login**

   Authenticates users and returns a token.

   **Code Snippet:**

   ```javascript
   fastify.post("/client/login", async (req, rep) => {
       // Authentication logic
   });
   ```

2. **Account Management**

   Creates and deletes accounts.

   **Code Snippet:**

   ```javascript
   fastify.post("/backend/credentials/create", async (req, rep) => {
       // Create account
   });

   fastify.post("/backend/credentials/delete", async (req, rep) => {
       // Delete account
   });
   ```

3. **User Management**

   Bans and unbans users.

   **Code Snippet:**

   ```javascript
   fastify.get("/backend/ban-user/name/:tradingName/now", async (req, rep) => {
       // Ban user
   });
   ```

4. **Statistics and Monitoring**

   Provides system statistics and retrieves user coin balances.

   **Code Snippet:**

   ```javascript
   fastify.get("/stats/now", async (req, rep) => {
       // Return system statistics
   });

   fastify.get("/backend/retreive-coins/:userId/now", async (req, rep) => {
       // Return user coins
   });
   ```

---

## Error Handling and Logging

1. **Error Handling**

   Captures and logs errors using the `uncaughtException` handler and `handleError` function.

   **Code Snippet:**

   ```javascript
   process.on('uncaughtException', (error) => {
       // Handle error
   });

   function handleError(errorDetails) {
       // Process error details
   }
   ```

2. **Logging**

   Uses the `webhook` function to send logs and error messages to a Discord webhook.

   **Code Snippet:**

   ```javascript
   function webhook(link, message) {
       // Send message to Discord webhook
   }
   ```

---

## Cluster Management

Distributes workload across multiple CPU cores using Node.js clustering.

**Key Functions:**

- `cluster.fork()`: Starts new worker processes.
- `cluster.on('exit')`: Restarts worker processes if they crash.

**Code Snippet:**

```javascript
if (cluster.isMaster) {
    // Master process logic
} else {
    const fastify = createServer();
    fastify.listen({
        port: 10000,
        host: "0.0.0.0"
    });
}
```

---

## Security Measures

1. **Hash Verification**

   Uses HMAC for request validation.

   **Code Snippet:**

   ```javascript
   function generateHmac(data) {
       // Generate HMAC
   }

   function verifyHash(hash, data) {
       // Verify hash
   }
   ```

2. **Rate-Limiting**

   Implements mechanisms to limit the number of requests from a single client.

3. **Lockdown Mechanisms**

   Restricts access to certain features through lockdowns.

---

## System Statistics and Monitoring

1. **System Statistics**

   Returns statistics such as memory and CPU usage.

   **Code Snippet:**

   ```javascript
   function returnLocalStats() {
       // Return system statistics
   }
   ```

2. **Regular Snapshots**

   Takes snapshots of usage statistics every 60 seconds.

   **Code Snippet:**

   ```javascript
   async function saveStatsSnapshot() {
       // Save statistics snapshot
   }
   ```

---

## Utility Functions

1. **File Access Functions**

   Manages reading and writing to the accounts file.

   **Code Snippet:**

   ```javascript
   const readAccountsFile = () => {
       // Read accounts file
   };

   const writeAccountsFile = (accounts) => {
       // Write to accounts file
   };
   ```

2. **Webhook Function**

   Sends messages to a Discord webhook.

   **Code Snippet:**

   ```javascript
   function webhook(link, message) {
       // Send message to Discord webhook
   }
   ```

---

## Future Enhancements

1. **Enhanced Rate-Limiting**

   Additional rate-limiting mechanisms may be implemented for improved protection.

2. **Expanded Security Measures**

   New security features could be added to further secure the system.

3. **Improved Monitoring Functions**

   More advanced monitoring and analytics features might be integrated.

---

## Sources and References

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Cluster API Documentation](https://nodejs.org/api/cluster.html)
- [Crypto Module Documentation](https://nodejs.org/api/crypto.html)
- [OS Module Documentation](https://nodejs.org/api/os.html)

---

## Discord Bot

This **Discord bot** manages trading credentials, tracks usage stats, and controls access to the trading system.

### Prerequisites

Ensure the following are installed:
- Python 3.8 or higher
- Libraries: 
  - discord
  - requests
  - matplotlib
  - asyncio
  - websockets
  - hmac, hashlib
  - json, os, time
  - random, string, re

Install required libraries with:
```bash
pip install discord requests matplotlib
```

### Configuration

Set up the bot by configuring:
- **Bot Token**: Obtain from the Discord Developer Portal and set it as `BOT_TOKEN`.
- **Authorized User IDs**: List of user IDs authorized for admin commands.
- **Server URLs**: Replace placeholders with your server's URL.

### Features

#### User Commands

1. **Generate Credentials**
   - Command: `/credentials trading_name referer(optional)`
   - Description: Generates a unique username and password for trading.

   **Example:**
   ```bash
   /credentials trading_name="myname" referer="optional_friend"
   ```

2. **View Coins**
   - Command: `/coins`
   - Description: Fetches and displays the user's coin balance.

   **Example:**
   ```bash
   /coins
   ```
   

#### Admin Commands

1. **Ban User**
   - Command: `/ban-user user name`
   - Description: Bans a user's account, preventing future access.

   **Example:**
   ```bash
   /ban-user user="@discord_user" name="trading_name"
   ```

2. **Unban User**
   - Command: `/unban-user user name`
   - Description: Unbans a previously banned account.

   **Example:**
   ```bash
   /unban-user user="@discord_user" name="trading_name"
   ```

3. **Lock/Unlock Login**
   - Command: `/lock-login`, `/unlock-login`
   - Description: Locks or unlocks the ability for users to log in or register.

4. **Lock/Unlock Trading**
   - Command: `/lock-trading`, `/unlock-trading`
   - Description: Locks or unlocks trading activities on the server.

5. **Usage Stats**
   - Command: `/usage-stats`
   - Description: Displays usage statistics including successful trades, coins traded, and more in graphical form.

6. **Server Stats**
   - Command: `/stats`
   - Description: Shows an overview of server-wide statistics such as active users, trading locks, and cluster information.

7. **Lockdown/Release**
   - Command: `/lockdown`, `/release`
   - Description: Initiates or lifts a server-wide lockdown.

### Logging and Webhooks

- **Webhooks**: The bot uses webhooks to log key events such as bans and locks.
- **Local Logging**: Logs are stored locally in the `log.txt` file, capturing activities like credential generation.

### Cooldown Management

Cooldowns for credential generation are managed through the `users.json` file, tracking which users have generated credentials and limiting multiple sets.

### Matplotlib for Stats

The bot uses `matplotlib` to generate usage stats graphs for admins. These graphs are embedded into the bot's responses as images.

### Running the Bot

To run the bot, execute the following command:
```bash
python bot.py
```
The bot will sync its commands with your Discord server and become available for interactions.

### License

Trading Server System © 2024 by mawo95 is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
